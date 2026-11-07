import { writeAtomicFile } from "../../../utils/atomic_file";
import type {
  EffectSummaryResult,
  EffectSummaryOptions,
} from "../types/effect_summary";
import axios from "axios";
import { sleep } from "../../../utils/delay";
import logger from "../../../utils/logger";
import { describeError } from "../../../utils/error_details";
import { tryAsyncItem } from "../../../utils/item_processing";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";
import { createEffectDetails, FALLBACK_EFFECT_SUMMARY } from "./summary";
import {
  effectFilePath,
  readEffectDocument,
  writeEffectSummaryFailure,
} from "./storage";

const REQUEST_DELAY_MS = 1000;
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 5;

/**
 * 효능 XML 조회
 */
async function fetchEeDocData(itemSeq: string) {
  const response = await axios.get<string>(
    "https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/" + itemSeq + "/EE",
    {
      timeout: 15000,
      responseType: "text",
    },
  );

  return {
    document: response.data,
    httpStatus: response.status,
    contentType: response.headers["content-type"] as string | undefined,
  };
}

/**
 * 재시도 대기 시간 계산
 */
export function getRetryAfterMs(value: unknown, now = Date.now()) {
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

/**
 * 효능 문서 검증·요약
 */
function summarizeDocument(document: string | null | undefined) {
  if (
    typeof document !== "string" ||
    !document.trim() ||
    /<!doctype\s+html|<html[\s>]/i.test(document)
  ) {
    return {
      summary: FALLBACK_EFFECT_SUMMARY,
      keyword: FALLBACK_EFFECT_SUMMARY,
    };
  }

  return createEffectDetails(document);
}

/**
 * 효능 요약 조회·재시도
 */
export async function fetchEffectSummaryResult(
  itemSeq: string,
  options: EffectSummaryOptions = {},
): Promise<EffectSummaryResult> {
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const wait = options.wait ?? sleep;
  const fetchDocument = options.fetchDocument ?? fetchEeDocData;

  effectFilePath(itemSeq, "documents", directory);

  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    !Number.isFinite(retryDelayMs) ||
    retryDelayMs < 0
  ) {
    throw new Error("Invalid effect summary retry options");
  }

  if (options.useCache !== false) {
    const cached = await tryAsyncItem(
      () => readEffectDocument(itemSeq, directory),
      "effect cache read ITEM_SEQ=" + itemSeq,
    );

    const { summary, keyword } = summarizeDocument(cached);

    if (summary !== FALLBACK_EFFECT_SUMMARY) {
      return {
        summary,
        keyword,
        httpStatus: null,
        attempts: 0,
        message: "cached",
      };
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let document: string;
    let httpStatus: number | null = null;
    let contentType: string | undefined;

    try {
      const response = await fetchDocument(itemSeq);
      document = typeof response === "string" ? response : response.document;

      if (typeof response !== "string") {
        httpStatus = response.httpStatus;
        contentType = response.contentType;
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        logger.warn(
          "[EE-SUMMARY] Axios error ITEM_SEQ=%s attempt=%s reason=%s",
          itemSeq,
          attempt,
          describeError(e),
        );
      }

      const httpStatus = axios.isAxiosError(e)
        ? (e.response?.status ?? null)
        : null;
      const retryable = httpStatus === 429;
      const message = e.message || String(e);

      logger.warn(
        "[EE-SUMMARY] Failed ITEM_SEQ=%s attempt=%s status=%s: %s",
        itemSeq,
        attempt,
        httpStatus,
        message,
      );

      if (!retryable || attempt === maxAttempts) {
        return {
          summary: FALLBACK_EFFECT_SUMMARY,
          keyword: FALLBACK_EFFECT_SUMMARY,
          reason: httpStatus === null ? "network_error" : "http_error",
          httpStatus,
          attempts: attempt,
          message,
        };
      }

      const retryAfter = getRetryAfterMs(e.response?.headers?.["retry-after"]);
      const delay = Math.max(retryDelayMs * 2 ** (attempt - 1), retryAfter);

      logger.warn("[EE-SUMMARY] Retry ITEM_SEQ=%s after %sms", itemSeq, delay);

      await wait(delay);
      continue;
    }

    const { summary, keyword } = summarizeDocument(document);

    if (summary === FALLBACK_EFFECT_SUMMARY) {
      const empty = typeof document !== "string" || !document.trim();
      const html = !empty && /<!doctype\s+html|<html[\s>]/i.test(document);
      const detail = empty
        ? "응답 본문이 비어 있습니다."
        : html
          ? "XML 대신 HTML 페이지가 반환되었습니다."
          : "응답 본문에서 요약 가능한 효능 내용을 추출하지 못했습니다.";
      const preview =
        typeof document === "string"
          ? document.replace(/\s+/g, " ").slice(0, 300)
          : "";
      const message = `${detail} contentType=${contentType ?? "unknown"} length=${typeof document === "string" ? document.length : 0} preview=${preview}`;
      logger.warn(
        "[EE-SUMMARY] Invalid response ITEM_SEQ=%s attempt=%s status=%s: %s",
        itemSeq,
        attempt,
        httpStatus,
        message,
      );

      return {
        summary,
        keyword: FALLBACK_EFFECT_SUMMARY,
        reason: empty ? "empty_document" : "empty_summary",
        httpStatus,
        attempts: attempt,
        message,
      };
    }

    await tryAsyncItem(
      () =>
        writeAtomicFile(
          effectFilePath(itemSeq, "documents", directory),
          document,
        ),
      "effect cache write ITEM_SEQ=" + itemSeq,
    );

    return {
      summary,
      keyword,
      httpStatus,
      attempts: attempt,
      message: "success",
    };
  }

  throw new Error("Unreachable effect summary retry state");
}

/**
 * 단일 효능 요약 실패 격리
 */
async function fetchItemSummary(
  itemSeq: string,
  options: EffectSummaryOptions,
): Promise<EffectSummaryResult> {
  const result = await tryAsyncItem(
    () => fetchEffectSummaryResult(itemSeq, options),
    "effect summary ITEM_SEQ=" + itemSeq,
  );

  return (
    result ?? {
      summary: FALLBACK_EFFECT_SUMMARY,
      keyword: FALLBACK_EFFECT_SUMMARY,
      reason: "network_error",
      httpStatus: null,
      attempts: 0,
      message: "효능 처리에 실패하여 기존 요약을 유지합니다.",
    }
  );
}

/**
 * 단일 요약 실패 기록
 */
async function recordSummaryFailure(
  itemSeq: string,
  result: EffectSummaryResult,
  directory: string,
): Promise<void> {
  const reason = result.reason;
  const hasFailure = reason !== undefined;
  if (!hasFailure) {
    return;
  }

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

/**
 * 품목별 효능 요약 수집
 */
export async function fetchEffectSummaryMap(
  itemSeqList: string[],
  options: EffectSummaryOptions = {},
) {
  const requestDelayMs = options.requestDelayMs ?? REQUEST_DELAY_MS;

  if (!Number.isFinite(requestDelayMs) || requestDelayMs < 0) {
    throw new Error("Invalid effect summary request delay");
  }

  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const itemSeqs = [...new Set(itemSeqList.filter(Boolean))];
  const summaryMap = new Map<string, EffectSummaryResult>();
  const wait = options.wait ?? sleep;
  const fetchDocument = options.fetchDocument ?? fetchEeDocData;
  let lastRequestedAt: number | null = null;
  let rateLimited = false;

  /**
   * 호출 간격 적용·조회
   */
  async function fetchPacedDocument(itemSeq: string) {
    if (lastRequestedAt !== null) {
      const delay = requestDelayMs - (Date.now() - lastRequestedAt);

      if (delay > 0) {
        await wait(delay);
      }
    }

    lastRequestedAt = Date.now();

    return fetchDocument(itemSeq);
  }

  for (let index = 0; index < itemSeqs.length; index += 1) {
    const itemSeq = itemSeqs[index];

    const result: EffectSummaryResult = rateLimited
      ? {
          summary: FALLBACK_EFFECT_SUMMARY,
          keyword: FALLBACK_EFFECT_SUMMARY,
          reason: "rate_limit_deferred",
          httpStatus: null,
          attempts: 0,
          message:
            "이전 항목의 HTTP 429가 지속되어 조회를 다음 실행으로 연기했습니다.",
        }
      : await fetchItemSummary(itemSeq, {
          ...options,
          fetchDocument: fetchPacedDocument,
        });

    await recordSummaryFailure(itemSeq, result, directory);

    if (result.httpStatus === 429) {
      rateLimited = true;
      logger.warn(
        "[EE-SUMMARY] Persistent HTTP 429. Remaining items will be saved for a later run.",
      );
    }

    summaryMap.set(itemSeq, result);

    await tryAsyncItem(async () => {
      await options.onResult?.(itemSeq, result);
    }, "effect callback ITEM_SEQ=" + itemSeq);

    const completed = index + 1;

    if (completed % 100 === 0 || completed === itemSeqs.length) {
      logger.info("[EE-SUMMARY] %s / %s", completed, itemSeqs.length);
    }
  }

  return summaryMap;
}
