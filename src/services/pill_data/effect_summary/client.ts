import axios from "axios";

import { writeAtomicFile } from "../../../utils/atomic_file";
import type {
  EffectDocumentResponse,
  EffectSummaryResult,
  EffectSummaryOptions,
} from "../types/effect_summary";
import logger from "../../../utils/logger";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";
import { createEffectSummary, FALLBACK_EFFECT_SUMMARY } from "./summary";
import {
  effectFilePath,
  readEffectDocument,
  writeEffectSummaryFailure,
} from "./storage";

const REQUEST_DELAY_MS = 1000;
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 5;

type FetchDocument = NonNullable<EffectSummaryOptions["fetchDocument"]>;
type Wait = NonNullable<EffectSummaryOptions["wait"]>;

interface RequestContext {
  directory: string;
  maxAttempts: number;
  retryDelayMs: number;
  wait: Wait;
  fetchDocument: FetchDocument;
}

interface DocumentResponse {
  document: string;
  httpStatus: number | null;
  contentType?: string;
}

type AttemptOutcome =
  | { kind: "response"; response: DocumentResponse }
  | { kind: "result"; result: EffectSummaryResult }
  | { kind: "retry" };

/**
 * 요청·재시도 간격 대기
 */
function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * 효능 XML과 HTTP 메타데이터 조회
 */
async function fetchEeDocData(
  itemSeq: string,
): Promise<EffectDocumentResponse> {
  const response = await axios.get<string>(
    "https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/" + itemSeq + "/EE",
    { timeout: 15000, responseType: "text" },
  );

  return {
    document: response.data,
    httpStatus: response.status,
    contentType: response.headers["content-type"] as string | undefined,
  };
}

/**
 * Retry-After 초·날짜 값의 대기 시간 변환
 */
export function getRetryAfterMs(value: unknown, now = Date.now()) {
  const isEmptyValue =
    value === undefined || value === null || String(value).trim() === "";

  if (isEmptyValue) {
    return 0;
  }

  const seconds = Number(value);
  const isValidSeconds = Number.isFinite(seconds) && seconds >= 0;

  if (isValidSeconds) {
    return seconds * 1000;
  }

  const date = Date.parse(String(value));

  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

/**
 * 빈 응답·HTML 오류 페이지를 제외한 효능 요약 생성
 */
function summarizeDocument(document: string) {
  const isInvalidDocument =
    typeof document !== "string" ||
    !document.trim() ||
    /<!doctype\s+html|<html[\s>]/i.test(document);

  if (isInvalidDocument) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  return createEffectSummary(document);
}

/**
 * 효능 조회 옵션 기본값 적용·유효성 검증
 */
function createRequestContext(options: EffectSummaryOptions): RequestContext {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const hasInvalidOptions =
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    !Number.isFinite(retryDelayMs) ||
    retryDelayMs < 0;

  if (hasInvalidOptions) {
    throw new Error("Invalid effect summary retry options");
  }

  return {
    directory: options.directory ?? RESOURCE_DIRECTORY,
    maxAttempts,
    retryDelayMs,
    wait: options.wait ?? sleep,
    fetchDocument: options.fetchDocument ?? fetchEeDocData,
  };
}

/**
 * 유효한 원문 캐시의 요약 결과 조회
 */
async function readCachedSummary(
  itemSeq: string,
  directory: string,
  useCache: boolean,
): Promise<EffectSummaryResult | null> {
  const shouldSkipCache = !useCache;

  if (shouldSkipCache) {
    return null;
  }

  const cached = await readEffectDocument(itemSeq, directory);
  const summary =
    cached === null ? FALLBACK_EFFECT_SUMMARY : summarizeDocument(cached);
  const isFallbackSummary = summary === FALLBACK_EFFECT_SUMMARY;

  if (isFallbackSummary) {
    return null;
  }

  return { summary, httpStatus: null, attempts: 0, message: "cached" };
}

/**
 * 문자열·객체 응답의 문서 구조 통일
 */
function normalizeDocumentResponse(
  response: string | EffectDocumentResponse,
): DocumentResponse {
  const isTextResponse = typeof response === "string";

  return isTextResponse
    ? { document: response, httpStatus: null }
    : {
        document: response.document,
        httpStatus: response.httpStatus,
        contentType: response.contentType,
      };
}

/**
 * 조회 오류의 HTTP 상태·메시지 추출 및 기록
 */
function describeRequestError(error: any, itemSeq: string, attempt: number) {
  const isHttpError = axios.isAxiosError(error);

  if (isHttpError) {
    logger.warn(
      "[EE-SUMMARY] Axios error ITEM_SEQ=%s attempt=%s: %O",
      itemSeq,
      attempt,
      error,
    );
  }

  const httpStatus = isHttpError ? (error.response?.status ?? null) : null;
  const message = error.message || String(error);

  logger.warn(
    "[EE-SUMMARY] Failed ITEM_SEQ=%s attempt=%s status=%s: %s",
    itemSeq,
    attempt,
    httpStatus,
    message,
  );

  return { httpStatus, message };
}

/**
 * HTTP 429 재시도 대기 또는 최종 실패 결과 생성
 */
async function handleRequestError(
  error: any,
  itemSeq: string,
  attempt: number,
  context: RequestContext,
): Promise<AttemptOutcome> {
  const { httpStatus, message } = describeRequestError(error, itemSeq, attempt);
  const shouldRetry = httpStatus === 429 && attempt < context.maxAttempts;

  if (!shouldRetry) {
    return {
      kind: "result",
      result: {
        summary: FALLBACK_EFFECT_SUMMARY,
        reason: httpStatus === null ? "network_error" : "http_error",
        httpStatus,
        attempts: attempt,
        message,
      },
    };
  }

  const retryAfter = getRetryAfterMs(error.response?.headers?.["retry-after"]);
  const delay = Math.max(context.retryDelayMs * 2 ** (attempt - 1), retryAfter);

  logger.warn("[EE-SUMMARY] Retry ITEM_SEQ=%s after %sms", itemSeq, delay);

  await context.wait(delay);

  return { kind: "retry" };
}

/**
 * 단일 효능 문서 조회·오류 처리
 */
async function fetchDocumentAttempt(
  itemSeq: string,
  attempt: number,
  context: RequestContext,
): Promise<AttemptOutcome> {
  try {
    const response = normalizeDocumentResponse(
      await context.fetchDocument(itemSeq),
    );

    return { kind: "response", response };
  } catch (error) {
    return handleRequestError(error, itemSeq, attempt, context);
  }
}

/**
 * 유효하지 않은 문서의 원인 설명 생성
 */
function getInvalidDocumentDetail(document: string) {
  const isEmptyDocument = typeof document !== "string" || !document.trim();

  if (isEmptyDocument) {
    return "응답 본문이 비어 있습니다.";
  }

  const isHtmlDocument = /<!doctype\s+html|<html[\s>]/i.test(document);

  if (isHtmlDocument) {
    return "XML 대신 HTML 페이지가 반환되었습니다.";
  }

  return "응답 본문에서 요약 가능한 효능 내용을 추출하지 못했습니다.";
}

/**
 * 빈 문서·요약 실패 응답의 진단 결과 생성
 */
function createInvalidDocumentResult(
  response: DocumentResponse,
  itemSeq: string,
  attempt: number,
): EffectSummaryResult {
  const { document, httpStatus, contentType } = response;
  const isEmptyDocument = typeof document !== "string" || !document.trim();
  const isTextDocument = typeof document === "string";
  const preview = isTextDocument
    ? document.replace(/\s+/g, " ").slice(0, 300)
    : "";
  const length = isTextDocument ? document.length : 0;
  const message =
    getInvalidDocumentDetail(document) +
    " contentType=" +
    (contentType ?? "unknown") +
    " length=" +
    length +
    " preview=" +
    preview;

  logger.warn(
    "[EE-SUMMARY] Invalid response ITEM_SEQ=%s attempt=%s status=%s: %s",
    itemSeq,
    attempt,
    httpStatus,
    message,
  );

  return {
    summary: FALLBACK_EFFECT_SUMMARY,
    reason: isEmptyDocument ? "empty_document" : "empty_summary",
    httpStatus,
    attempts: attempt,
    message,
  };
}

/**
 * 문서 요약 결과 생성·유효 원문 캐시 저장
 */
async function createDocumentResult(
  response: DocumentResponse,
  itemSeq: string,
  attempt: number,
  directory: string,
): Promise<EffectSummaryResult> {
  const summary = summarizeDocument(response.document);
  const isFallbackSummary = summary === FALLBACK_EFFECT_SUMMARY;

  if (isFallbackSummary) {
    return createInvalidDocumentResult(response, itemSeq, attempt);
  }

  await writeAtomicFile(
    effectFilePath(itemSeq, "documents", directory),
    response.document,
  );

  return {
    summary,
    httpStatus: response.httpStatus,
    attempts: attempt,
    message: "success",
  };
}

/**
 * 최대 시도 횟수 안에서 효능 문서 순차 조회
 */
async function fetchSummaryWithRetries(
  itemSeq: string,
  context: RequestContext,
): Promise<EffectSummaryResult> {
  for (let attempt = 1; attempt <= context.maxAttempts; attempt += 1) {
    const outcome = await fetchDocumentAttempt(itemSeq, attempt, context);
    const hasResult = outcome.kind === "result";

    if (hasResult) {
      return outcome.result;
    }

    const shouldRetry = outcome.kind === "retry";

    if (shouldRetry) {
      continue;
    }

    return createDocumentResult(
      outcome.response,
      itemSeq,
      attempt,
      context.directory,
    );
  }

  throw new Error("Unreachable effect summary retry state");
}

/**
 * 원문 캐시 우선 조회·HTTP 429 재시도
 */
export async function fetchEffectSummaryResult(
  itemSeq: string,
  options: EffectSummaryOptions = {},
): Promise<EffectSummaryResult> {
  const directory = options.directory ?? RESOURCE_DIRECTORY;

  effectFilePath(itemSeq, "documents", directory);

  const context = createRequestContext(options);
  const cached = await readCachedSummary(
    itemSeq,
    directory,
    options.useCache !== false,
  );
  const hasCachedSummary = cached !== null;

  if (hasCachedSummary) {
    return cached;
  }

  return fetchSummaryWithRetries(itemSeq, context);
}

/**
 * 실제 HTTP 호출에만 최소 요청 간격 적용
 */
function createPacedDocumentFetcher(
  fetchDocument: FetchDocument,
  wait: Wait,
  requestDelayMs: number,
): FetchDocument {
  let lastRequestedAt: number | null = null;

  /**
   * 직전 요청과의 간격 대기 후 문서 조회
   */
  async function fetchPacedDocument(itemSeq: string) {
    const previousRequestedAt = lastRequestedAt;
    const hasPreviousRequest = previousRequestedAt !== null;
    const delay = hasPreviousRequest
      ? requestDelayMs - (Date.now() - previousRequestedAt)
      : 0;
    const shouldWait = delay > 0;

    if (shouldWait) {
      await wait(delay);
    }

    lastRequestedAt = Date.now();

    return fetchDocument(itemSeq);
  }

  return fetchPacedDocument;
}

/**
 * 요청 제한이 지속된 품목의 다음 실행 연기 결과 생성
 */
async function fetchNextSummary(
  itemSeq: string,
  isRateLimited: boolean,
  options: EffectSummaryOptions,
): Promise<EffectSummaryResult> {
  if (isRateLimited) {
    return {
      summary: FALLBACK_EFFECT_SUMMARY,
      reason: "rate_limit_deferred",
      httpStatus: null,
      attempts: 0,
      message:
        "이전 항목의 HTTP 429가 지속되어 조회를 다음 실행으로 연기했습니다.",
    };
  }

  return fetchEffectSummaryResult(itemSeq, options);
}

/**
 * 실패한 품목의 재처리 기록 저장
 */
async function recordSummaryFailure(
  itemSeq: string,
  result: EffectSummaryResult,
  directory: string,
) {
  const reason = result.reason;
  const hasFailure = reason !== undefined;

  if (hasFailure) {
    await writeEffectSummaryFailure(
      {
        ITEM_SEQ: itemSeq,
        reason,
        httpStatus: result.httpStatus,
        attempts: result.attempts,
        message: result.message,
      },
      directory,
    );
  }
}

/**
 * 지속된 HTTP 429 기록·확인
 */
function logPersistentRateLimit(result: EffectSummaryResult): boolean {
  const isRateLimited = result.httpStatus === 429;

  if (isRateLimited) {
    logger.warn(
      "[EE-SUMMARY] Persistent HTTP 429. Remaining items will be saved for a later run.",
    );
  }

  return isRateLimited;
}

/**
 * 백 건 단위·마지막 품목의 진행 건수 기록
 */
function logSummaryProgress(completed: number, total: number) {
  const shouldLogProgress = completed % 100 === 0 || completed === total;

  if (shouldLogProgress) {
    logger.info("[EE-SUMMARY] %s / %s", completed, total);
  }
}

/**
 * 요청 간격의 유한한 음이 아닌 값 검증
 */
function validateRequestDelay(requestDelayMs: number) {
  const isInvalidDelay = !Number.isFinite(requestDelayMs) || requestDelayMs < 0;

  if (isInvalidDelay) {
    throw new Error("Invalid effect summary request delay");
  }
}

/**
 * 품목별 효능 요약 수집·실패 기록·요청 제한 연기
 */
export async function fetchEffectSummaryMap(
  itemSeqList: string[],
  options: EffectSummaryOptions = {},
) {
  const requestDelayMs = options.requestDelayMs ?? REQUEST_DELAY_MS;

  validateRequestDelay(requestDelayMs);

  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const itemSeqs = [...new Set(itemSeqList.filter(Boolean))];
  const summaryMap = new Map<string, string>();
  const fetchDocument = createPacedDocumentFetcher(
    options.fetchDocument ?? fetchEeDocData,
    options.wait ?? sleep,
    requestDelayMs,
  );
  let isRateLimited = false;

  for (const [index, itemSeq] of itemSeqs.entries()) {
    const result = await fetchNextSummary(itemSeq, isRateLimited, {
      ...options,
      fetchDocument,
    });

    await recordSummaryFailure(itemSeq, result, directory);

    isRateLimited = logPersistentRateLimit(result) || isRateLimited;
    summaryMap.set(itemSeq, result.summary);

    await options.onResult?.(itemSeq, result);

    logSummaryProgress(index + 1, itemSeqs.length);
  }

  return summaryMap;
}
