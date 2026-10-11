import axios from "axios";
import logger from "../../../shared/logging/logger";
import { RESOURCE_DIRECTORY } from "../../../shared/paths";
import { createEffectSummary, FALLBACK_EFFECT_SUMMARY } from "./summary";
import { EffectFailureReason, effectFilePath, readEffectDocument, writeAtomicFile, writeEffectSummaryFailure } from "./storage";

const REQUEST_DELAY_MS = 1000;
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 5;

export interface EffectSummaryResult {
  summary: string;
  reason?: EffectFailureReason;
  httpStatus: number | null;
  attempts: number;
  message: string;
}

export interface EffectSummaryOptions {
  directory?: string;
  requestDelayMs?: number;
  retryDelayMs?: number;
  maxAttempts?: number;
  useCache?: boolean;
  fetchDocument?: (itemSeq: string) => Promise<string>;
  wait?: (ms: number) => Promise<void>;
  onResult?: (itemSeq: string, result: EffectSummaryResult) => Promise<void>;
}

/** 지정한 시간 동안 대기하여 요청 간격과 서버의 재시도 지시를 지킨다. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 효능 XML 조회 오류를 호출자에게 전달해 실패 원인과 HTTP 상태를 보존한다. */
async function fetchEeDocData(itemSeq: string): Promise<string> {
  const response = await axios.get<string>("https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/" + itemSeq + "/EE", {
    timeout: 15000,
    responseType: "text",
  });

  return response.data;
}

/** Retry-After의 초 단위 또는 HTTP 날짜를 밀리초 단위의 대기 시간으로 변환한다. */
export function getRetryAfterMs(value: unknown, now = Date.now()): number {
  if (value === undefined || value === null || String(value).trim() === "") {
    return 0;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const date = Date.parse(String(value));

  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

/** 조회 결과가 아닌 오류 페이지를 문서로 오인하지 않고 비어 있는 응답도 실패로 구분한다. */
function summarizeDocument(document: string): string {
  if (typeof document !== "string" || !document.trim() || /<!doctype\s+html|<html[\s>]/i.test(document)) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  return createEffectSummary(document);
}

/** 원문 캐시를 활용하고 일시적 HTTP·네트워크 오류만 지수 백오프로 재시도한다. */
export async function fetchEffectSummaryResult(itemSeq: string, options: EffectSummaryOptions = {}): Promise<EffectSummaryResult> {
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const wait = options.wait ?? sleep;
  const fetchDocument = options.fetchDocument ?? fetchEeDocData;
  effectFilePath(itemSeq, "documents", directory);

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || !Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error("Invalid effect summary retry options");
  }

  if (options.useCache !== false) {
    const cached = await readEffectDocument(itemSeq, directory);
    const summary = cached === null ? FALLBACK_EFFECT_SUMMARY : summarizeDocument(cached);

    if (summary !== FALLBACK_EFFECT_SUMMARY) {
      return { summary, httpStatus: null, attempts: 0, message: "cached" };
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let document: string;

    try {
      document = await fetchDocument(itemSeq);
    }
    catch (error) {
      const httpStatus = axios.isAxiosError(error) ? error.response?.status ?? null : null;
      const retryable = httpStatus === null || httpStatus === 429 || httpStatus >= 500;
      const message = error.message || String(error);
      logger.warn("[EE-SUMMARY] Failed ITEM_SEQ=%s attempt=%s status=%s: %s", itemSeq, attempt, httpStatus, message);

      if (!retryable || attempt === maxAttempts) {
        return { summary: FALLBACK_EFFECT_SUMMARY, reason: httpStatus === null ? "network_error" : "http_error", httpStatus, attempts: attempt, message };
      }

      const retryAfter = getRetryAfterMs(error.response?.headers?.["retry-after"]);
      const delay = Math.max(retryDelayMs * 2 ** (attempt - 1), retryAfter);
      logger.warn("[EE-SUMMARY] Retry ITEM_SEQ=%s after %sms", itemSeq, delay);
      await wait(delay);
      continue;
    }

    const summary = summarizeDocument(document);

    if (summary === FALLBACK_EFFECT_SUMMARY) {
      return {
        summary,
        reason: typeof document !== "string" || !document.trim() ? "empty_document" : "empty_summary",
        httpStatus: null,
        attempts: attempt,
        message: "조회 응답에서 유효한 효능 요약을 만들 수 없습니다.",
      };
    }

    // 캐시 저장 오류는 조회 실패로 숨기지 않고 호출자에게 전달한다.
    await writeAtomicFile(effectFilePath(itemSeq, "documents", directory), document);

    return { summary, httpStatus: null, attempts: attempt, message: "success" };
  }

  throw new Error("Unreachable effect summary retry state");
}

/** 실패를 항목별 파일에 기록하고 지속적인 429 발생 시 나머지 요청을 다음 실행으로 미룬다. */
export async function fetchEffectSummaryMap(itemSeqList: string[], batchSize = 5, options: EffectSummaryOptions = {}): Promise<Map<string, string>> {
  const requestDelayMs = options.requestDelayMs ?? REQUEST_DELAY_MS;

  if (!Number.isInteger(batchSize) || batchSize <= 0 || !Number.isFinite(requestDelayMs) || requestDelayMs < 0) {
    throw new Error("Invalid effect summary batch options");
  }

  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const itemSeqs = [...new Set(itemSeqList.filter(Boolean))];
  const summaryMap = new Map<string, string>();
  const wait = options.wait ?? sleep;
  let rateLimited = false;

  for (let index = 0; index < itemSeqs.length; index += 1) {
    const itemSeq = itemSeqs[index];

    if (index > 0 && !rateLimited) {
      await wait(requestDelayMs);
    }

    const result: EffectSummaryResult = rateLimited
      ? { summary: FALLBACK_EFFECT_SUMMARY, reason: "rate_limit_deferred", httpStatus: null, attempts: 0, message: "이전 항목의 HTTP 429가 지속되어 조회를 다음 실행으로 연기했습니다." }
      : await fetchEffectSummaryResult(itemSeq, options);

    if (result.reason) {
      await writeEffectSummaryFailure({ ITEM_SEQ: itemSeq, reason: result.reason, httpStatus: result.httpStatus, attempts: result.attempts, message: result.message }, directory);
    }

    if (result.httpStatus === 429) {
      rateLimited = true;
      logger.warn("[EE-SUMMARY] Persistent HTTP 429. Remaining items will be saved for a later run.");
    }

    summaryMap.set(itemSeq, result.summary);
    await options.onResult?.(itemSeq, result);
    const completed = index + 1;

    if (completed % Math.max(batchSize, 100) === 0 || completed === itemSeqs.length) {
      logger.info("[EE-SUMMARY] %s / %s", completed, itemSeqs.length);
    }
  }

  return summaryMap;
}
