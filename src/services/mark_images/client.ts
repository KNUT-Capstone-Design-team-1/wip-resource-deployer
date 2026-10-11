import axios from "axios";
import { encode } from "base64-arraybuffer";
import logger from "../../utils/logger";

/**
 * 지정한 밀리초만큼 대기하여 요청 간격을 조절한다.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 최신 Chrome 브라우저의 User-Agent 생성
 */
function getLatestUserAgent() {
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
export function isValidBase64(base64Payload: string) {
  const isEmptyPayload = !base64Payload;

  if (isEmptyPayload) {
    return false;
  }

  const hasInvalidLength = base64Payload.length % 4 !== 0;

  if (hasInvalidLength) {
    return false;
  }

  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(base64Payload);
}

/**
 * 원격 이미지 URL을 요청하여 Base64 Data URL 문자열로 변환
 *
 * Base64 변환은 base64-arraybuffer 라이브러리를 사용한다.
 */
async function downloadImage(url: string) {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: {
      "User-Agent": getLatestUserAgent(),
      Referer: "https://nedrug.mfds.go.kr/",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  const contentType = response.headers["content-type"]
    ?.split(";")[0].trim().toLowerCase();
  const isImage = contentType?.startsWith("image/");

  if (!isImage) {
    throw new Error("Invalid image response: content-type=" + contentType);
  }

  return "data:" + contentType + ";base64," + encode(response.data);
}

/**
 * 이미지 다운로드 실패 시 응답 상태와 시도 횟수에 따라 대기한 뒤 재시도한다.
 */
async function downloadWithRetry(url: string, attempt: number, retries: number): Promise<string> {
  try {
    return await downloadImage(url);
  }
  catch (e) {
    const status = e.response?.status ?? null;
    const isLastAttempt = attempt === retries;

    if (isLastAttempt) {
      throw new Error("Failed after " + retries + " attempts (" +
        (status || e.message) + "): " + url);
    }

    const delay = status === 429 ? 2000 * attempt : 1000 * attempt;

    logger.warn("[MARK-IMAGE] Retrying in %sms for %s: %s", delay, url, status || e.message);
    await sleep(delay);
  }

  return downloadWithRetry(url, attempt + 1, retries);
}

/**
 * 재시도 횟수를 검증하고 원격 이미지를 Base64 Data URL로 가져온다.
 */
export async function fetchImageBase64(url: string, retries = 5) {
  const isValidRetryCount = Number.isInteger(retries) && retries > 0;

  if (!isValidRetryCount) {
    throw new Error("retries must be a positive integer");
  }

  return downloadWithRetry(url, 1, retries);
}
