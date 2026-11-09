import type {
  EffectSummaryOptions,
  EffectSummaryResult,
  EffectDocumentResponse,
} from "../types/effect_summary";
import { createEffectDetails, FALLBACK_EFFECT_SUMMARY } from "./summary";
import { effectFilePath, readEffectDocument } from "./storage";
import { tryAsyncItem } from "../../../utils/item_processing";
import { writeAtomicFile } from "../../../utils/atomic_file";
import logger from "../../../utils/logger";

function summarizeDocument(document: string | null | undefined) {
  if (!documentIsUsable(document))
    return {
      summary: FALLBACK_EFFECT_SUMMARY,
      keyword: FALLBACK_EFFECT_SUMMARY,
    };
  return createEffectDetails(document);
}

function documentIsUsable(
  document: string | null | undefined,
): document is string {
  return (
    typeof document === "string" &&
    Boolean(document.trim()) &&
    !/<!doctype\s+html|<html[\s>]/i.test(document)
  );
}

export async function readCachedEffectSummary(
  itemSeq: string,
  directory: string,
  options: EffectSummaryOptions,
): Promise<EffectSummaryResult | undefined> {
  if (options.useCache === false) return undefined;
  const cached = await tryAsyncItem(
    () => readEffectDocument(itemSeq, directory),
    "effect cache read ITEM_SEQ=" + itemSeq,
  );
  const { summary, keyword } = summarizeDocument(cached);
  if (summary === FALLBACK_EFFECT_SUMMARY) return undefined;
  return { summary, keyword, httpStatus: null, attempts: 0, message: "cached" };
}

function normalizeResponse(response: string | EffectDocumentResponse) {
  if (typeof response === "string")
    return { document: response, httpStatus: null, contentType: undefined };
  return response;
}

function invalidDocumentDetail(document: string) {
  if (!document.trim()) return "응답 본문이 비어 있습니다.";
  if (/<!doctype\s+html|<html[\s>]/i.test(document))
    return "XML 대신 HTML 페이지가 반환되었습니다.";
  return "응답 본문에서 요약 가능한 효능 내용을 추출하지 못했습니다.";
}

function invalidDocumentResult(
  itemSeq: string,
  response: ReturnType<typeof normalizeResponse>,
  attempts: number,
): EffectSummaryResult {
  const document =
    typeof response.document === "string" ? response.document : "";
  const preview = document.replace(/\s+/g, " ").slice(0, 300);
  const message = `${invalidDocumentDetail(document)} contentType=${response.contentType ?? "unknown"} length=${document.length} preview=${preview}`;
  logger.warn(
    "[EE-SUMMARY] Invalid response ITEM_SEQ=%s attempt=%s status=%s: %s",
    itemSeq,
    attempts,
    response.httpStatus,
    message,
  );
  return {
    summary: FALLBACK_EFFECT_SUMMARY,
    keyword: FALLBACK_EFFECT_SUMMARY,
    reason: document.trim() ? "empty_summary" : "empty_document",
    httpStatus: response.httpStatus,
    attempts,
    message,
  };
}

export async function summarizeEffectResponse(
  itemSeq: string,
  value: string | EffectDocumentResponse,
  directory: string,
  attempts: number,
): Promise<EffectSummaryResult> {
  const response = normalizeResponse(value);
  const { summary, keyword } = summarizeDocument(response.document);
  if (summary === FALLBACK_EFFECT_SUMMARY)
    return invalidDocumentResult(itemSeq, response, attempts);
  await tryAsyncItem(
    () =>
      writeAtomicFile(
        effectFilePath(itemSeq, "documents", directory),
        response.document,
      ),
    "effect cache write ITEM_SEQ=" + itemSeq,
  );
  return {
    summary,
    keyword,
    httpStatus: response.httpStatus,
    attempts,
    message: "success",
  };
}
