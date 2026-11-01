import { MarkEntry, IMarkImageData } from "./types/mark_images";
import { IDrugRecognition } from "../pill_data/types/drug_recognition";
import { fetchImageBase64, isValidBase64 } from "./client";
import { mapConcurrent } from "../../utils/concurrent";
import logger from "../../utils/logger";

export interface MarkImageOptions {
  concurrency?: number;
  fetchImage?: (url: string) => Promise<string>;
}

/**
 * 유효 마크 중복 제거
 */
function registerMark(entries: Map<string, MarkEntry>, entry: MarkEntry): void {
  const hasUsableMark = Boolean(entry.code.trim()) && Boolean(entry.url.trim());
  if (!hasUsableMark) {
    return;
  }

  const isDuplicate = entries.has(entry.code);
  if (isDuplicate) {
    return;
  }

  entries.set(entry.code, entry);
}

/**
 * 앞뒤 마크 수집
 */
function collectMarks(drugs: IDrugRecognition[]): MarkEntry[] {
  const entries = new Map<string, MarkEntry>();

  for (const drug of drugs) {
    registerMark(entries, {
      title: drug.MARK_CODE_FRONT_ANAL ?? "",
      code: drug.MARK_CODE_FRONT ?? "",
      url: drug.MARK_CODE_FRONT_IMG ?? "",
    });
    registerMark(entries, {
      title: drug.MARK_CODE_BACK_ANAL ?? "",
      code: drug.MARK_CODE_BACK ?? "",
      url: drug.MARK_CODE_BACK_IMG ?? "",
    });
  }

  return [...entries.values()];
}

/**
 * 이미지 데이터 검증
 */
function isImageData(base64: string): boolean {
  const isDataUrl = base64.startsWith("data:image/");
  const payload = isDataUrl ? (base64.split(";base64,")[1] ?? "") : base64;

  return isValidBase64(payload);
}

/**
 * 마크 이미지 변환
 */
async function createMark(
  entry: MarkEntry,
  fetchImage: (url: string) => Promise<string>,
): Promise<IMarkImageData[]> {
  const isRemoteImage = /^https?:\/\//i.test(entry.url);
  const base64 = isRemoteImage ? await fetchImage(entry.url) : entry.url;

  const isValidImage = isImageData(base64);
  if (!isValidImage) {
    logger.warn("[MARK-IMAGE] Excluded invalid base64 data for %s", entry.code);

    return [];
  }

  return [{ title: entry.title, code: entry.code, base64 }];
}

/**
 * 마크 병렬 변환
 */
export async function createMarkImageData(
  drugs: IDrugRecognition[],
  options: MarkImageOptions = {},
): Promise<IMarkImageData[]> {
  const entries = collectMarks(drugs);
  const fetchImage = options.fetchImage ?? fetchImageBase64;
  // 같은 URL을 쓰는 다른 마크 코드도 한 번만 다운로드한다. 캐시는 실행 중에만 유지한다.
  const downloads = new Map<string, Promise<string>>();
  /**
   * 이미지 URL 캐시 조회
   */
  const cachedFetch = (url: string): Promise<string> => {
    const download = downloads.get(url) ?? fetchImage(url);
    downloads.set(url, download);

    return download;
  };

  const images = await mapConcurrent(
    entries,
    options.concurrency ?? 3,
    (entry) => createMark(entry, cachedFetch),
  );

  return images.flat();
}
