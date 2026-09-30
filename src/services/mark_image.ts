import axios from "axios";
import { encode } from "base64-arraybuffer";
import { IDrugRecognition, IMarkImageData } from "../types";
import { createResourceFile, logger, ResourceLoader } from "../utils";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 최신 Chrome 브라우저의 User-Agent 생성
 */
function getLatestUserAgent(): string {
  const baseYear = 2024;
  const baseVersion = 120;
  const currentYear = new Date().getFullYear();
  const estimatedVersion = baseVersion + (currentYear - baseYear) * 12;

  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${estimatedVersion}.0.0.0 Safari/537.36`;
}

/**
 * Base64 문자열 유효성 검증
 *
 * 디코딩을 수행하지 않고 Base64 형식 자체만 검사한다.
 * Buffer / Uint8Array 등의 애플리케이션 레벨 바이너리 변환을 사용하지 않는다.
 */
function isValidBase64(base64Payload: string): boolean {
  if (!base64Payload) {
    return false;
  }

  if (base64Payload.length % 4 !== 0) {
    return false;
  }

  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(
    base64Payload,
  );
}

/**
 * 원격 이미지 URL을 요청하여 Base64 Data URL 문자열로 변환
 *
 * Base64 변환은 base64-arraybuffer 라이브러리를 사용한다.
 */
async function fetchImageBase64(url: string, retries = 5): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: {
          "User-Agent": getLatestUserAgent(),
          Referer: "https://nedrug.mfds.go.kr/",
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      const contentType = response.headers["content-type"]
        ?.split(";")[0]
        .trim()
        .toLowerCase();

      if (!contentType?.startsWith("image/")) {
        throw new Error(`Invalid image response: content-type=${contentType}`);
      }

      const base64Data = encode(response.data);

      return `data:${contentType};base64,${base64Data}`;
    } catch (e: any) {
      const status = e.response?.status ?? null;

      if (attempt === retries) {
        throw new Error(
          `Failed after ${retries} attempts (${status || e.message}): ${url}`,
        );
      }

      const waitTime = status === 429 ? 2000 * attempt : 1000 * attempt;

      logger.warn(
        `[MARK-IMAGE] (${status || e.message}) Retrying in ${waitTime}ms for ${url}`,
      );

      await sleep(waitTime);
    }
  }

  throw new Error(`Failed to download image: ${url}`);
}

/**
 * 마크 이미지 데이터 생성
 */
export async function createMarkImageData(
  drugRecognition: Array<IDrugRecognition>,
): Promise<Array<IMarkImageData>> {
  const markImageMap = new Map<
    string,
    {
      title: string;
      code: string;
      url: string;
    }
  >();

  for (const item of drugRecognition) {
    const hasFrontMark = Boolean(
      item.DRUG_SHAPE_FRONT || item.MARK_IMAGE_FRONT || item.MARK_CODE_FRONT,
    );

    const hasBackMark = Boolean(
      item.DRUG_SHAPE_BACK || item.MARK_IMAGE_BACK || item.MARK_CODE_BACK,
    );

    if (
      hasFrontMark &&
      item.MARK_CODE_FRONT &&
      !markImageMap.has(item.MARK_CODE_FRONT)
    ) {
      markImageMap.set(item.MARK_CODE_FRONT, {
        title: item.DRUG_SHAPE_FRONT,
        code: item.MARK_CODE_FRONT,
        url: item.MARK_IMAGE_FRONT,
      });
    }

    if (
      hasBackMark &&
      item.MARK_CODE_BACK &&
      !markImageMap.has(item.MARK_CODE_BACK)
    ) {
      markImageMap.set(item.MARK_CODE_BACK, {
        title: item.DRUG_SHAPE_BACK,
        code: item.MARK_CODE_BACK,
        url: item.MARK_IMAGE_BACK,
      });
    }
  }

  const markEntries = Array.from(markImageMap.values());
  const markImageData: Array<IMarkImageData> = [];

  for (let i = 0; i < markEntries.length; i++) {
    const item = markEntries[i];

    let base64 = item.url;

    if (item.url?.startsWith("http")) {
      try {
        base64 = await fetchImageBase64(item.url);

        await sleep(150);
      } catch (e: any) {
        logger.error(
          `[MARK-IMAGE] Failed to download image for ${item.code} (${item.url}): ${e.message}`,
        );
      }
    }

    if (!base64) {
      logger.warn(
        `[MARK-IMAGE] Empty image data for ${item.code} (${item.title})`,
      );
      continue;
    }

    const isDataUrl = base64.startsWith("data:image/");
    const base64Payload = isDataUrl
      ? (base64.split(";base64,")[1] ?? "")
      : base64;

    if (isValidBase64(base64Payload)) {
      markImageData.push({
        title: item.title,
        code: item.code,
        base64,
      });
    } else {
      logger.warn(
        `[MARK-IMAGE] Excluded invalid base64 data for ${item.code} (${item.title}): length=${base64Payload.length}, data=${base64.slice(0, 50)}...`,
      );
    }

    if ((i + 1) % 50 === 0 || i === markEntries.length - 1) {
      logger.info(
        `[MARK-IMAGE] Progress: ${i + 1}/${markEntries.length} (${(((i + 1) / markEntries.length) * 100).toFixed(1)}%)`,
      );
    }
  }

  return markImageData;
}

/**
 * 마크 이미지 리소스 파일 생성
 */
export async function createMarkImageResource() {
  try {
    logger.info("[MARK-IMAGE] Start load resource");

    const resourceLoader = new ResourceLoader(["drug_recognition"]);

    const resource = await resourceLoader.loadResource();

    logger.info("[MARK-IMAGE] Complete load resource");

    logger.info("[MARK-IMAGE] Start create mark image data");

    const markImageData = await createMarkImageData(resource.drugRecognition);

    logger.info("[MARK-IMAGE] Complete create mark image data");

    logger.info("[MARK-IMAGE] Start create mark image resource file");

    await createResourceFile("mark_images.json", markImageData, false);

    logger.info("[MARK-IMAGE] Complete create mark image resource file");
  } catch (e: any) {
    logger.error(
      "[MARK-IMAGE] Failed to create mark image resource file. %s",
      e.stack || e,
    );
  }
}
