import type {
  EffectSummaryResult,
  EffectSummaryOptions,
} from "../types/effect_summary";
import { sleep } from "../../../utils/delay";
import logger from "../../../utils/logger";
import { tryAsyncItem } from "../../../utils/item_processing";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";
import { FALLBACK_EFFECT_SUMMARY } from "./summary";
import { effectFilePath, writeEffectSummaryFailure } from "./storage";
import {
  requestEffectDocument,
  validateEffectRequestOptions,
  fetchEeDocument,
} from "./request";
import {
  readCachedEffectSummary,
  summarizeEffectResponse,
} from "./document_response";
export { getRetryAfterMs } from "./request";

/** 캐시를 확인한 뒤 단일 품목의 효능을 조회한다. */
export async function fetchEffectSummaryResult(
  itemSeq: string,
  options: EffectSummaryOptions = {},
): Promise<EffectSummaryResult> {
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  effectFilePath(itemSeq, "documents", directory);
  validateEffectRequestOptions(options);
  const cached = await readCachedEffectSummary(itemSeq, directory, options);
  if (cached) return cached;
  const outcome = await requestEffectDocument(itemSeq, options);
  if (!outcome.ok) return outcome.result;
  return summarizeEffectResponse(
    itemSeq,
    outcome.response,
    directory,
    outcome.attempts,
  );
}

function failedSummary(
  message: string,
  reason: EffectSummaryResult["reason"],
): EffectSummaryResult {
  return {
    summary: FALLBACK_EFFECT_SUMMARY,
    keyword: FALLBACK_EFFECT_SUMMARY,
    reason,
    httpStatus: null,
    attempts: 0,
    message,
  };
}

async function fetchItemSummary(
  itemSeq: string,
  options: EffectSummaryOptions,
): Promise<EffectSummaryResult> {
  const result = await tryAsyncItem(
    () => fetchEffectSummaryResult(itemSeq, options),
    "effect summary ITEM_SEQ=" + itemSeq,
  );
  return (
    result ??
    failedSummary(
      "효능 처리에 실패하여 기존 요약을 유지합니다.",
      "network_error",
    )
  );
}

async function recordSummaryFailure(
  itemSeq: string,
  result: EffectSummaryResult,
  directory: string,
): Promise<void> {
  const reason = result.reason;
  if (reason === undefined) return;
  await tryAsyncItem(
    () =>
      writeEffectSummaryFailure(
        {
          ITEM_SEQ: itemSeq,
          reason,
          httpStatus: result.httpStatus,
          attempts: result.attempts,
          message: result.message,
        },
        directory,
      ),
    "effect failure record ITEM_SEQ=" + itemSeq,
  );
}

function validateRequestDelay(delay: number) {
  if (!Number.isFinite(delay) || delay < 0)
    throw new Error("Invalid effect summary request delay");
}

/** 요청 간격은 네트워크 요청에만 적용하고 캐시 조회에는 적용하지 않는다. */
function createPacedFetcher(options: EffectSummaryOptions) {
  const requestDelayMs = options.requestDelayMs ?? 1000;
  validateRequestDelay(requestDelayMs);
  const wait = options.wait ?? sleep;
  const fetchDocument = options.fetchDocument ?? fetchEeDocument;
  let lastRequestedAt: number | null = null;
  return async (itemSeq: string) => {
    if (lastRequestedAt !== null) {
      const delay = requestDelayMs - (Date.now() - lastRequestedAt);
      if (delay > 0) await wait(delay);
    }
    lastRequestedAt = Date.now();
    return fetchDocument(itemSeq);
  };
}

async function collectItemSummary(
  itemSeq: string,
  options: EffectSummaryOptions,
  state: { rateLimited: boolean },
) {
  if (state.rateLimited)
    return failedSummary(
      "이전 항목의 HTTP 429가 지속되어 조회를 다음 실행으로 연기했습니다.",
      "rate_limit_deferred",
    );
  const result = await fetchItemSummary(itemSeq, options);
  if (result.httpStatus === 429) {
    state.rateLimited = true;
    logger.warn(
      "[EE-SUMMARY] Persistent HTTP 429. Remaining items will be saved for a later run.",
    );
  }
  return result;
}

function logProgress(completed: number, total: number) {
  if (completed % 100 === 0 || completed === total)
    logger.info("[EE-SUMMARY] %s / %s", completed, total);
}

/** config로 선택한 작업의 품목만 처리하며 실패 목록의 별도 재조회는 하지 않는다. */
export async function fetchEffectSummaryMap(
  itemSeqList: string[],
  options: EffectSummaryOptions = {},
) {
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const itemSeqs = [...new Set(itemSeqList.filter(Boolean))];
  const summaryMap = new Map<string, EffectSummaryResult>();
  const fetchDocument = createPacedFetcher(options);
  const state = { rateLimited: false };
  for (const itemSeq of itemSeqs) {
    const result = await collectItemSummary(
      itemSeq,
      { ...options, fetchDocument },
      state,
    );
    await recordSummaryFailure(itemSeq, result, directory);
    summaryMap.set(itemSeq, result);
    await tryAsyncItem(async () => {
      await options.onResult?.(itemSeq, result);
    }, "effect callback ITEM_SEQ=" + itemSeq);
    logProgress(summaryMap.size, itemSeqs.length);
  }
  return summaryMap;
}
