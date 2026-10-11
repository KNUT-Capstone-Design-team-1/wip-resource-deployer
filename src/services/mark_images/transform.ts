import type { MarkEntry } from "./types/mark_images";
import { IDrugRecognition } from "../pill_data/types/drug_recognition";
import { IMarkImageData } from "./types/mark_images";
import { fetchImageBase64, isValidBase64 } from "./client";
import logger from "../../utils/logger";

/**
 * 코드가 존재하고 아직 등록되지 않은 마크만 수집 목록에 추가한다.
 */
function registerMark(entries: Map<string, MarkEntry>, entry: MarkEntry) {
  const shouldRegister = Boolean(entry.code) && !entries.has(entry.code);

  if (!shouldRegister) {
    return;
  }

  entries.set(entry.code, entry);
}

/**
 * 의약품 앞면과 뒷면의 마크를 코드 기준으로 중복 없이 수집한다.
 */
function collectMarks(drugs: IDrugRecognition[]) {
  const entries = new Map<string, MarkEntry>();

  for (const drug of drugs) {
    registerMark(entries, {
      title: drug.DRUG_SHAPE_FRONT,
      code: drug.MARK_CODE_FRONT,
      url: drug.MARK_IMAGE_FRONT,
    });
    registerMark(entries, {
      title: drug.DRUG_SHAPE_BACK,
      code: drug.MARK_CODE_BACK,
      url: drug.MARK_IMAGE_BACK,
    });
  }

  return [...entries.values()];
}

/**
 * 원격 이미지를 다운로드하며 실패하거나 원격 주소가 아니면 원래 값을 반환한다.
 */
async function resolveImage(entry: MarkEntry) {
  const isRemoteImage = entry.url?.startsWith("http");

  if (!isRemoteImage) {
    return entry.url;
  }

  try {
    const image = await fetchImageBase64(entry.url);

    await new Promise((resolve) => setTimeout(resolve, 150));

    return image;
  }
  catch (e) {
    logger.error("[MARK-IMAGE] Failed image %s (%s): %s", entry.code, entry.url, e.message);

    return entry.url;
  }
}

/**
 * 이미지의 Base64 형식을 검증하고 유효한 마크만 리소스로 변환한다.
 */
async function createMark(entry: MarkEntry) {
  const base64 = await resolveImage(entry);
  const isEmpty = !base64;

  if (isEmpty) {
    logger.warn("[MARK-IMAGE] Empty image data for %s", entry.code);

    return [];
  }

  const isDataUrl = base64.startsWith("data:image/");
  const payload = isDataUrl ? (base64.split(";base64,")[1] ?? "") : base64;
  const isValidImage = isValidBase64(payload);

  if (!isValidImage) {
    logger.warn("[MARK-IMAGE] Excluded invalid base64 data for %s", entry.code);

    return [];
  }

  return [{ title: entry.title, code: entry.code, base64 }];
}

/**
 * 마크 처리 50건마다 또는 마지막 항목 처리 후 진행 상황을 기록한다.
 */
function logProgress(completed: number, total: number) {
  const shouldLog = completed % 50 === 0 || completed === total;

  if (shouldLog) {
    logger.info("[MARK-IMAGE] Progress: %s/%s", completed, total);
  }
}

/**
 * 중복을 제거한 마크를 순차적으로 처리해 유효한 이미지 리소스 배열을 만든다.
 */
export async function createMarkImageData(drugs: IDrugRecognition[]) {
  const entries = collectMarks(drugs);
  const images: IMarkImageData[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    images.push(...await createMark(entries[index]));
    logProgress(index + 1, entries.length);
  }

  return images;
}
