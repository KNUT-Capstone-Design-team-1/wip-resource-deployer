import axios from "axios";
import logger from "../../../shared/logging/logger";
import { createEffectSummary, FALLBACK_EFFECT_SUMMARY } from "./summary";
function removeDuplicateValues(values: string[]): string[] {
  return [...new Set(values)];
}
const REQUEST_DELAY_MS = 200;
const RETRY_DELAY_MS = 1000;
const MAX_RETRY_ATTEMPTS = 5;
/**
 * 지정된 시간(ms) 동안 대기(sleep)한다.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Nedrug API에서 ITEM_SEQ의 효능·효과 XML 원본 데이터를 조회한다.
 *
 * HTTP 429는 호출부에서 재시도할 수 있도록 그대로 throw한다.
 * 그 외 오류는 로그를 남기고 빈 문자열을 반환한다.
 */
async function fetchEeDocData(itemSeq: string, timeoutMs = 5000): Promise<string> {
  const url = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}/EE`;
  try {
    const response = await axios.get<string>(url, {
      timeout: timeoutMs,
    });
    return response.data;
  }
  catch (e) {
    logger.error(`[EE-SUMMARY] Failed ITEM_SEQ=${itemSeq}. error=${e?.message || e}`);
    const isRateLimited = axios.isAxiosError(e) && e.response?.status === 429;
    if (isRateLimited) {
      throw e;
    }
    return "";
  }
}
/**
 * 단일 ITEM_SEQ의 효능·효과 데이터를 조회하여 한 줄 요약으로 변환한다.
 */
async function fetchEffectSummary(itemSeq: string): Promise<string> {
  const eeDocData = await fetchEeDocData(itemSeq);
  const hasNoEffectDocument = !eeDocData;
  if (hasNoEffectDocument) {
    logger.warn(`[EE-SUMMARY] Empty EE_DOC_DATA: ${itemSeq}`);
    return FALLBACK_EFFECT_SUMMARY;
  }
  return createEffectSummary(eeDocData);
}
/**
 * HTTP 429가 발생한 ITEM_SEQ를 지수 백오프로 재시도한다.
 *
 * 최초 요청 이후 최대 MAX_RETRY_ATTEMPTS회까지 재시도한다.
 */
async function tryEffectSummaryRetry(itemSeq: string, attempt: number): Promise<string | null> {
  const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
  logger.warn("[EE-SUMMARY] Retry %s/%s ITEM_SEQ=%s after %sms", attempt, MAX_RETRY_ATTEMPTS, itemSeq, delay);
  await sleep(delay);
  try {
    return await fetchEffectSummary(itemSeq);
  }
  catch (error) {
    logger.error("[EE-SUMMARY] Retry failed ITEM_SEQ=%s. %s", itemSeq, error.message || error);
    return null;
  }
}
async function fetchEffectSummaryWithRetry(itemSeq: string): Promise<string> {
  let summary: string | null = null;
  let attempt = 1;
  while (summary === null && attempt <= MAX_RETRY_ATTEMPTS) {
    summary = await tryEffectSummaryRetry(itemSeq, attempt);
    attempt += 1;
  }
  return summary ?? FALLBACK_EFFECT_SUMMARY;
}
/**
 * 단일 ITEM_SEQ를 조회한다.
 *
 * 429가 아니면 최초 요청의 결과를 그대로 사용하고,
 * 429가 발생한 경우에만 재시도 로직을 실행한다.
 */
async function fetchEffectSummarySafely(itemSeq: string): Promise<string> {
  try {
    return await fetchEffectSummary(itemSeq);
  }
  catch (e) {
    const isRateLimited = axios.isAxiosError(e) && e.response?.status === 429;
    if (isRateLimited) {
      return fetchEffectSummaryWithRetry(itemSeq);
    }
    logger.error(`[EE-SUMMARY] Failed ITEM_SEQ=${itemSeq}. error=${e?.message || e}`);
    return FALLBACK_EFFECT_SUMMARY;
  }
}
/**
 * 단일 배치의 ITEM_SEQ들을 요청 간 지연시간을 두고 순차 처리한다.
 */
async function processSummaryItem(itemSeq: string, index: number, summaryMap: Map<string, string>): Promise<void> {
  const shouldDelay = index > 0;
  if (shouldDelay) {
    await sleep(REQUEST_DELAY_MS);
  }
  summaryMap.set(itemSeq, await fetchEffectSummarySafely(itemSeq));
}
async function processEffectSummaryBatch(itemSeqs: string[], summaryMap: Map<string, string>): Promise<void> {
  for (let index = 0; index < itemSeqs.length; index += 1) {
    await processSummaryItem(itemSeqs[index], index, summaryMap);
  }
}
/**
 * Nedrug ITEM_SEQ 목록을 배치 단위로 순차 처리하여
 * 최종 효능·효과 요약 Map을 반환한다.
 */
export async function fetchEffectSummaryMap(itemSeqList: string[], batchSize = 5): Promise<Map<string, string>> {
  const isValidBatchSize = Number.isInteger(batchSize) && batchSize > 0;
  if (!isValidBatchSize) {
    throw new Error("batchSize must be a positive integer");
  }
  const summaryMap = new Map<string, string>();
  const itemSeqs = removeDuplicateValues(itemSeqList.filter(Boolean));
  const isEmptyItemList = itemSeqs.length === 0;
  if (isEmptyItemList) {
    return summaryMap;
  }
  for (let start = 0; start < itemSeqs.length; start += batchSize) {
    const batch = itemSeqs.slice(start, start + batchSize);
    await processEffectSummaryBatch(batch, summaryMap);
    const completed = Math.min(start + batchSize, itemSeqs.length);
    logSummaryProgress(completed, itemSeqs.length);
  }
  return summaryMap;
}
function logSummaryProgress(completed: number, total: number): void {
  const shouldLog = completed % 100 === 0 || completed === total;
  if (shouldLog) {
    logger.info("[EE-SUMMARY] %s / %s", completed, total);
  }
}
