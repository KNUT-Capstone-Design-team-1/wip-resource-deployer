import axios from "axios";
import type {
  EffectDocumentResponse,
  EffectSummaryOptions,
  EffectSummaryResult,
} from "../types/effect_summary";
import { sleep } from "../../../utils/delay";
import logger from "../../../utils/logger";
import { describeError } from "../../../utils/error_details";
import { FALLBACK_EFFECT_SUMMARY } from "./summary";

type DocumentValue = string | EffectDocumentResponse;
type RequestOutcome =
  | { ok: true; response: DocumentValue; attempts: number }
  | { ok: false; result: EffectSummaryResult; retryAfterMs: number };

export async function fetchEeDocument(
  itemSeq: string,
): Promise<EffectDocumentResponse> {
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

export function getRetryAfterMs(value: unknown, now = Date.now()) {
  if (value === undefined || value === null || String(value).trim() === "")
    return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(String(value));
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

function requestSettings(options: EffectSummaryOptions) {
  const maxAttempts = options.maxAttempts ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 2000;
  validateRequestSettings(maxAttempts, retryDelayMs);
  return {
    maxAttempts,
    retryDelayMs,
    wait: options.wait ?? sleep,
    fetchDocument: options.fetchDocument ?? fetchEeDocument,
  };
}

function validateRequestSettings(attempts: number, delay: number) {
  const validAttempts = Number.isInteger(attempts) && attempts >= 1;
  const validDelay = Number.isFinite(delay) && delay >= 0;
  if (!validAttempts || !validDelay)
    throw new Error("Invalid effect summary retry options");
}

function requestFailure(
  error: unknown,
  itemSeq: string,
  attempt: number,
): RequestOutcome {
  const axiosError = axios.isAxiosError(error) ? error : undefined;
  const httpStatus = axiosError?.response?.status ?? null;
  const message = error instanceof Error ? error.message : String(error);
  logger.warn(
    "[EE-SUMMARY] Failed ITEM_SEQ=%s attempt=%s status=%s: %s",
    itemSeq,
    attempt,
    httpStatus,
    describeError(error),
  );
  return {
    ok: false,
    retryAfterMs: getRetryAfterMs(
      axiosError?.response?.headers?.["retry-after"],
    ),
    result: {
      summary: FALLBACK_EFFECT_SUMMARY,
      keyword: FALLBACK_EFFECT_SUMMARY,
      reason: httpStatus === null ? "network_error" : "http_error",
      httpStatus,
      attempts: attempt,
      message,
    },
  };
}

async function requestOnce(
  itemSeq: string,
  attempt: number,
  fetchDocument: (id: string) => Promise<DocumentValue>,
): Promise<RequestOutcome> {
  try {
    return {
      ok: true,
      response: await fetchDocument(itemSeq),
      attempts: attempt,
    };
  } catch (error) {
    return requestFailure(error, itemSeq, attempt);
  }
}

function shouldRetry(
  outcome: Extract<RequestOutcome, { ok: false }>,
  attempt: number,
  maxAttempts: number,
) {
  return outcome.result.httpStatus === 429 && attempt < maxAttempts;
}

async function waitBeforeRetry(
  itemSeq: string,
  attempt: number,
  retryAfterMs: number,
  settings: ReturnType<typeof requestSettings>,
) {
  const delay = Math.max(
    settings.retryDelayMs * 2 ** (attempt - 1),
    retryAfterMs,
  );
  logger.warn("[EE-SUMMARY] Retry ITEM_SEQ=%s after %sms", itemSeq, delay);
  await settings.wait(delay);
}

export async function requestEffectDocument(
  itemSeq: string,
  options: EffectSummaryOptions,
): Promise<RequestOutcome> {
  const settings = requestSettings(options);
  for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
    const outcome = await requestOnce(itemSeq, attempt, settings.fetchDocument);
    if (outcome.ok) return outcome;
    if (!shouldRetry(outcome, attempt, settings.maxAttempts)) return outcome;
    await waitBeforeRetry(itemSeq, attempt, outcome.retryAfterMs, settings);
  }
  throw new Error("Unreachable effect summary retry state");
}

export function validateEffectRequestOptions(options: EffectSummaryOptions) {
  validateRequestSettings(
    options.maxAttempts ?? 5,
    options.retryDelayMs ?? 2000,
  );
}
