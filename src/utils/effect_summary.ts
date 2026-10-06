import axios from "axios";
import logger from "./logger";

const FALLBACK_EFFECT_SUMMARY = "효능·효과 정보를 확인할 수 없습니다.";

/**
 * Nedrug 연속 요청 사이에 적용할 최소 대기 시간(ms).
 *
 * 동시에 여러 요청을 보내는 것보다 안정적으로 요청량을 분산하기 위한 값이다.
 */
const REQUEST_DELAY_MS = 200;

const EFFECT_VERB_PATTERN =
  /치료|개선|완화|억제|예방|경감|감소|제거|보조|사용한다|사용할 수 있다|적응/;

/**
 * 여러 ITEM_SEQ를 배치 단위로 처리해 효능·효과 요약 Map을 생성한다.
 *
 * @param itemSeqList 품목일련번호 목록
 * @param batchSize 한 번에 묶어 처리할 ITEM_SEQ 개수
 * @returns ITEM_SEQ를 키로 하는 EFFECT_SUMMARY Map
 */
export async function fetchEffectSummaryMap(
  itemSeqList: Array<string>,
  batchSize = 5,
): Promise<Map<string, string>> {
  const summaryMap = new Map<string, string>();
  const rateLimitedItemSeqs = new Set<string>();
  const uniqueItemSeqList = removeDuplicateValues(itemSeqList.filter(Boolean));

  const hasItems = uniqueItemSeqList.length > 0;

  if (!hasItems) {
    return summaryMap;
  }

  for (let start = 0; start < uniqueItemSeqList.length; start += batchSize) {
    const batch = uniqueItemSeqList.slice(start, start + batchSize);

    await processEffectSummaryBatch(batch, summaryMap, rateLimitedItemSeqs);

    const completed = Math.min(start + batchSize, uniqueItemSeqList.length);
    const isProgressCheckpoint =
      completed % 100 === 0 || completed === uniqueItemSeqList.length;

    if (isProgressCheckpoint) {
      logger.info(`[EE-SUMMARY] ${completed} / ${uniqueItemSeqList.length}`);
    }
  }

  await retryRateLimitedItemSeqs(rateLimitedItemSeqs, summaryMap);

  return summaryMap;
}

/**
 * 하나의 배치에 포함된 ITEM_SEQ를 순차적으로 처리한다.
 *
 * 참고 데이터 수집 로직과 동일하게 배치 내부에서는 동시에 요청하지 않는다.
 * 요청 사이에 짧은 대기 시간을 두어 Nedrug 요청량을 분산한다.
 * 429가 발생한 ITEM_SEQ는 즉시 재시도하지 않고 별도로 모은다.
 *
 * @param batchItemSeqs 현재 배치의 ITEM_SEQ 목록
 * @param summaryMap 결과를 저장할 Map
 * @param rateLimitedItemSeqs 429 발생 ITEM_SEQ를 저장할 Set
 */
async function processEffectSummaryBatch(
  batchItemSeqs: string[],
  summaryMap: Map<string, string>,
  rateLimitedItemSeqs: Set<string>,
): Promise<void> {
  for (let index = 0; index < batchItemSeqs.length; index += 1) {
    const itemSeq = batchItemSeqs[index];
    const hasPreviousRequest = index > 0;

    if (hasPreviousRequest) {
      await sleep(REQUEST_DELAY_MS);
    }

    const result = await fetchEffectSummarySafely(itemSeq, false);

    summaryMap.set(itemSeq, result.summary);

    if (result.isRateLimited) {
      rateLimitedItemSeqs.add(itemSeq);
    }
  }
}

/**
 * 하나의 ITEM_SEQ 처리 결과를 안전한 결과 객체로 변환한다.
 *
 * HTTP 429는 즉시 재시도하지 않고 호출자에게 전달한다.
 *
 * @param itemSeq 품목일련번호
 * @param isRetry 전체 1차 처리가 끝난 뒤 수행하는 재시도인지 여부
 * @returns 요약 결과와 429 발생 여부
 */
async function fetchEffectSummarySafely(
  itemSeq: string,
  isRetry: boolean,
): Promise<{
  summary: string;
  isRateLimited: boolean;
}> {
  try {
    const summary = await fetchEffectSummary(itemSeq);

    return {
      summary,
      isRateLimited: false,
    };
  } catch (error: any) {
    const isRateLimited = error instanceof RateLimitError;

    if (isRateLimited && !isRetry) {
      logger.warn(`[EE-SUMMARY] HTTP 429 ITEM_SEQ=${itemSeq}. Deferred retry.`);

      return {
        summary: FALLBACK_EFFECT_SUMMARY,
        isRateLimited: true,
      };
    }

    logger.error(
      "[EE-SUMMARY] Failed ITEM_SEQ=%s. error: %s",
      itemSeq,
      error?.message || error,
    );

    return {
      summary: FALLBACK_EFFECT_SUMMARY,
      isRateLimited: false,
    };
  }
}

/**
 * HTTP 429 응답을 일반 오류와 구분하기 위한 전용 오류 클래스다.
 */
class RateLimitError extends Error {
  constructor(message = "HTTP 429 Too Many Requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * 지정된 시간만큼 대기한다.
 *
 * @param ms 대기 시간(ms)
 * @returns 대기 Promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 1차 전체 처리가 끝난 후 429 대상만 모아서 재시도한다.
 *
 * @param rateLimitedItemSeqs 1차 처리에서 429가 발생한 ITEM_SEQ 목록
 * @param summaryMap 결과를 저장할 Map
 */
async function retryRateLimitedItemSeqs(
  rateLimitedItemSeqs: Set<string>,
  summaryMap: Map<string, string>,
): Promise<void> {
  const retryItemSeqs = [...rateLimitedItemSeqs];
  const hasRetryItems = retryItemSeqs.length > 0;

  if (!hasRetryItems) {
    return;
  }

  logger.info(
    `[EE-SUMMARY] Deferred retry start: ${retryItemSeqs.length} ITEM_SEQ`,
  );

  await sleep(1000);

  for (let index = 0; index < retryItemSeqs.length; index += 1) {
    const itemSeq = retryItemSeqs[index];
    const hasPreviousRequest = index > 0;

    if (hasPreviousRequest) {
      await sleep(REQUEST_DELAY_MS);
    }

    const result = await fetchEffectSummarySafely(itemSeq, true);

    summaryMap.set(itemSeq, result.summary);
  }

  logger.info(
    `[EE-SUMMARY] Deferred retry complete: ${retryItemSeqs.length} ITEM_SEQ`,
  );
}

/**
 * 하나의 ITEM_SEQ에 대한 효능·효과 요약을 생성한다.
 *
 * @param itemSeq 품목일련번호
 * @returns 항상 문자열인 효능·효과 요약
 */
async function fetchEffectSummary(itemSeq: string): Promise<string> {
  const eeDocData = await fetchEeDocData(itemSeq);
  const hasEeDocData = Boolean(eeDocData);

  if (!hasEeDocData) {
    logger.warn(`[EE-SUMMARY] Empty EE_DOC_DATA: ${itemSeq}`);

    return FALLBACK_EFFECT_SUMMARY;
  }

  return createEffectSummary(eeDocData);
}

/**
 * Nedrug에서 하나의 ITEM_SEQ에 대한 EE_DOC_DATA를 가져온다.
 *
 * HTTP 429 발생 시 즉시 재요청하지 않고 RateLimitError를 발생시킨다.
 * 실제 재시도는 전체 1차 처리가 끝난 뒤 수행한다.
 *
 * @param itemSeq 품목일련번호
 * @param timeoutMs 요청 타임아웃(ms)
 * @returns EE_DOC_DATA 문자열
 */
async function fetchEeDocData(
  itemSeq: string,
  timeoutMs = 5000,
): Promise<string> {
  const url = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}/EE`;

  try {
    const response = await axios.get<string>(url, {
      timeout: timeoutMs,
    });

    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const isRateLimit = status === 429;

    if (isRateLimit) {
      throw new RateLimitError(`HTTP 429: ${itemSeq}`);
    }

    logger.error(
      `[EE-SUMMARY] Failed ITEM_SEQ=${itemSeq}. error: ${
        error?.message || error
      }`,
    );

    return "";
  }
}

/**
 * EE_DOC_DATA 원문을 최종 한 줄 효능·효과 요약으로 변환한다.
 *
 * @param eeDocData MFDS EE_DOC_DATA 원문
 * @param maxLength 권장 최대 길이
 * @returns 항상 문자열을 반환하는 효능·효과 요약
 */
function createEffectSummary(
  eeDocData: string | null | undefined,
  maxLength = 80,
): string {
  const hasEeDocData = Boolean(eeDocData?.trim());

  if (!hasEeDocData) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  const cleaned = cleanHtml(eeDocData);
  const hasCleanedText = Boolean(cleaned);

  if (!hasCleanedText) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  const effectOnly = removeNonEffectLines(cleaned);
  const withoutBoilerplate = removeBoilerplate(effectOnly);

  const sentences = splitSentences(withoutBoilerplate);

  const normalizedSentences = sentences
    .map(normalizeConnectors)
    .filter(Boolean);

  const uniqueSentences = removeDuplicateExpressions(normalizedSentences);

  const hasUniqueSentences = uniqueSentences.length > 0;

  if (!hasUniqueSentences) {
    return createFallbackSummary(cleaned, maxLength);
  }

  return (
    compressEffect(uniqueSentences, maxLength) ||
    createFallbackSummary(cleaned, maxLength)
  );
}

/**
 * HTML/XML 형태의 원본 효능·효과 데이터를 일반 텍스트로 정리한다.
 *
 * @param raw 원본 효능·효과 데이터
 * @returns HTML 태그와 불필요한 문자가 제거된 텍스트
 */
function cleanHtml(raw: string | null | undefined): string {
  const hasRawText = Boolean(raw?.trim());

  if (!hasRawText || typeof raw !== "string") {
    return "";
  }

  let text = raw;

  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");

  text = text.replace(
    /<(?:br|\/p|\/div|\/li|\/section|\/article)[^>]*>/gi,
    "\n",
  );

  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  text = text.replace(/[·•※○●◎◇◆□■▶▷]+/g, " ");

  return text
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * 효능·효과가 아닌 행을 제거한다.
 *
 * @param text 정제할 텍스트
 * @returns 효능·효과 관련 행만 남은 텍스트
 */
function removeNonEffectLines(text: string): string {
  const hasText = Boolean(text);

  if (!hasText) {
    return "";
  }

  return text
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(Boolean)
    .filter((line) => !isNonEffectLine(line))
    .join("\n");
}

/**
 * 효능·효과가 아닌 행인지 판별한다.
 *
 * @param line 판별할 텍스트
 * @returns 효능·효과와 무관한 행이면 true
 */
function isNonEffectLine(line: string): boolean {
  const hasLine = Boolean(line);

  if (!hasLine) {
    return true;
  }

  const nonEffectPatterns = [
    /^용법/,
    /^용량/,
    /^투여/,
    /^복용/,
    /^사용방법/,
    /^사용법/,
    /^주의/,
    /^금기/,
    /^경고/,
    /^신중히/,
    /^이상반응/,
    /^부작용/,
    /^상호작용/,
    /^임상시험/,
    /^임상/,
    /^보관/,
    /^저장/,
    /^취급/,
    /^첨가제/,
    /^성상/,
    /^포장/,
    /^보험/,
  ];

  const hasNonEffectHeading = nonEffectPatterns.some((pattern) =>
    pattern.test(line),
  );

  if (hasNonEffectHeading) {
    return true;
  }

  const nonEffectKeywords = [
    "환자에게만 투여",
    "환자에게 투여",
    "의사 또는 약사의 지시에 따라",
    "전문의의 처방",
  ];

  const hasNonEffectKeyword = nonEffectKeywords.some((keyword) =>
    line.includes(keyword),
  );

  return hasNonEffectKeyword;
}

/**
 * 효능·효과 데이터에 포함된 상투적인 표현과 섹션 제목을 제거한다.
 *
 * @param text 정제할 텍스트
 * @returns 상투 표현이 제거된 텍스트
 */
function removeBoilerplate(text: string): string {
  const hasText = Boolean(text);

  if (!hasText) {
    return "";
  }

  let result = text;

  result = result.replace(
    /(?:^|\n)\s*(?:효능[·ㆍ]?효과|효능 및 효과|효과)\s*:?\s*/gi,
    "\n",
  );

  result = result.replace(
    /(?:^|\n)\s*\d+\.\s*(?:효능[·ㆍ]?효과|효과)\s*:?\s*/gi,
    "\n",
  );

  result = result.replace(
    /다음\s+(?:질환|질병)\s+및\s+증상의?\s+(?:치료|개선|완화)\s*[:：]?\s*\n?/gi,
    "__EFFECT_ATTACH__:",
  );

  result = result.replace(
    /다음\s+(?:질환|질병)\s+및\s+증상의?\s+(?:치료|개선|완화)(?:에)?\s*(?:사용한다|사용할 수 있다)?/gi,
    "",
  );

  result = result.replace(/(?:에|의)\s*사용할\s*수\s*있다/gi, "");

  result = result.replace(/(?:에|의)\s*사용한다/gi, "");

  return result
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * 효능·효과 텍스트를 의미 단위의 문장으로 분리한다.
 *
 * @param text 분리할 텍스트
 * @returns 문장 배열
 */
function splitSentences(text: string): string[] {
  const hasText = Boolean(text);

  if (!hasText) {
    return [];
  }

  const lines = text.split(/\r?\n/).map(normalizeWhitespace).filter(Boolean);

  const result: string[] = [];
  let pendingEffect = "";

  for (const line of lines) {
    const parsed = parseEffectLine(line, pendingEffect);

    result.push(...parsed.sentences);
    pendingEffect = parsed.pendingEffect;
  }

  return result;
}

/**
 * 하나의 효능·효과 줄을 문장 배열에 추가한다.
 *
 * @param line 원본 줄
 * @param pendingEffect 앞선 줄에서 추출한 효과 표현
 * @returns 문장과 다음 pending effect
 */
function parseEffectLine(
  line: string,
  pendingEffect: string,
): {
  sentences: string[];
  pendingEffect: string;
} {
  const isEffectAttachment = line.startsWith("__EFFECT_ATTACH__:");

  if (isEffectAttachment) {
    return {
      sentences: [],
      pendingEffect: line.replace("__EFFECT_ATTACH__:", "").trim(),
    };
  }

  const sentences = splitLineIntoSentences(line);
  const hasPendingEffect = Boolean(pendingEffect);

  if (!hasPendingEffect) {
    return {
      sentences,
      pendingEffect,
    };
  }

  const result = sentences.map((sentence) => {
    const shouldAttachEffect = !hasEffectVerb(sentence);

    return shouldAttachEffect
      ? `${pendingEffect} ${sentence}`.trim()
      : sentence;
  });

  return {
    sentences: result,
    pendingEffect: "",
  };
}

/**
 * 문장을 여러 개의 의미 단위로 분리한다.
 *
 * @param line 분리할 한 줄
 * @returns 분리된 문장 배열
 */
function splitLineIntoSentences(line: string): string[] {
  const normalizedLine = normalizeWhitespace(line);
  const hasLine = Boolean(normalizedLine);

  if (!hasLine) {
    return [];
  }

  const parts = normalizedLine
    .split(/;|。|(?<!\d)\.(?!\d)|(?=\(\d+\))|(?=\d+\))/)
    .map(normalizeSentence)
    .filter(Boolean);

  return parts;
}

/**
 * 한 문장을 효능·효과 문장으로 정리한다.
 *
 * @param sentence 정리할 문장
 * @returns 정규화된 문장
 */
function normalizeSentence(sentence: string): string {
  const hasSentence = Boolean(sentence);

  if (!hasSentence) {
    return "";
  }

  return sentence.replace(/^(?:\d+[\.)]|[①②③④⑤⑥⑦⑧⑨⑩])\s*/, "").trim();
}

/**
 * 효능·효과 문장에 연결되어야 하는 효과 표현인지 판별한다.
 *
 * @param sentence 판별할 문장
 * @returns 효능·효과 동사를 포함하면 true
 */
function hasEffectVerb(sentence: string): boolean {
  return EFFECT_VERB_PATTERN.test(sentence);
}

/**
 * 조사와 접속 표현을 검색 결과 표시용 형태로 정규화한다.
 *
 * @param sentence 정규화할 문장
 * @returns 정규화된 문장
 */
function normalizeConnectors(sentence: string): string {
  const hasSentence = Boolean(sentence);

  if (!hasSentence) {
    return "";
  }

  let result = sentence;

  result = result
    .replace(/^(?:에서|에|의)\s+/g, "")
    .replace(/\s+(?:및|또는|혹은)\s+/g, ", ")
    .replace(/\s+(?:과|와)\s+/g, ", ");

  result = result
    .replace(/의\s+(증상\s+)?(?:완화|개선|치료)/g, "의 증상 완화")
    .replace(/의\s+(?:완화|치료|개선|억제|예방)/g, "의 증상 완화");

  return result
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,+/g, ",")
    .replace(/[,:;]\s*$/g, "")
    .trim();
}

/**
 * 문장 배열에서 중복된 효능·효과 표현을 제거한다.
 *
 * @param sentences 문장 배열
 * @returns 중복이 제거된 문장 배열
 */
function removeDuplicateExpressions(sentences: string[]): string[] {
  const hasSentences = sentences.length > 0;

  if (!hasSentences) {
    return [];
  }

  const normalizedSentences = sentences.map(normalizeWhitespace);

  return removeDuplicateValues(normalizedSentences.filter(Boolean));
}

/**
 * 여러 효능·효과 문장을 한 줄 요약으로 압축한다.
 *
 * @param sentences 문장 배열
 * @param maxLength 권장 최대 길이
 * @returns 압축된 한 줄 요약
 */
function compressEffect(sentences: string[], maxLength = 80): string {
  const validSentences = filterEmptyStrings(sentences);
  const hasSentences = validSentences.length > 0;

  if (!hasSentences) {
    return "";
  }

  let summary = "";

  for (const sentence of validSentences) {
    const candidate = summary ? `${summary}, ${sentence}` : sentence;

    const exceedsMaxLength = candidate.length > maxLength;

    if (!exceedsMaxLength) {
      summary = candidate;
      continue;
    }

    const hasSummary = Boolean(summary);

    if (hasSummary) {
      break;
    }

    return compressLongSentence(sentence, maxLength);
  }

  return summary || validSentences[0];
}

/**
 * 문자열 배열에서 빈 문자열을 제거한다.
 *
 * @param values 문자열 배열
 * @returns 빈 문자열이 제거된 배열
 */
function filterEmptyStrings(values: string[]): string[] {
  return values.map(normalizeWhitespace).filter(Boolean);
}

/**
 * 길이 제한 안에서 쉼표 단위의 의미 있는 문장을 생성한다.
 *
 * @param sentence 압축할 문장
 * @param maxLength 최대 권장 길이
 * @returns 길이 제한에 맞는 의미 단위
 */
function compressLongSentence(sentence: string, maxLength: number): string {
  const clauses = sentence
    .split(/,\s*/)
    .map(normalizeWhitespace)
    .filter(Boolean);

  const fittingClauses: string[] = [];

  for (const clause of clauses) {
    const candidate = fittingClauses.length
      ? `${fittingClauses.join(", ")}, ${clause}`
      : clause;

    const exceedsMaxLength = candidate.length > maxLength;

    if (exceedsMaxLength) {
      break;
    }

    fittingClauses.push(clause);
  }

  const hasFittingClauses = fittingClauses.length > 0;

  if (hasFittingClauses) {
    return fittingClauses.join(", ");
  }

  // 의미가 끊기는 substring 자르기는 하지 않는다.
  return clauses[0] ?? sentence;
}

/**
 * 정제 과정에서 문장이 모두 제거된 경우 원본 텍스트를 사용해 fallback을 생성한다.
 *
 * @param text 정제된 원본 텍스트
 * @param maxLength 권장 최대 길이
 * @returns fallback 요약
 */
function createFallbackSummary(text: string, maxLength = 80): string {
  const hasText = Boolean(text);

  if (!hasText) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  const candidates = text
    .split(/\r?\n|[.;。]/)
    .map(normalizeWhitespace)
    .filter(Boolean)
    .map(normalizeConnectors)
    .filter(Boolean);

  const hasCandidates = candidates.length > 0;

  if (!hasCandidates) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  return compressEffect(candidates, maxLength) || FALLBACK_EFFECT_SUMMARY;
}

/**
 * 문자열의 공백을 하나로 정규화한다.
 *
 * @param text 정규화할 문자열
 * @returns 앞뒤 공백과 연속 공백이 제거된 문자열
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 문자열 배열에서 중복 값을 제거한다.
 *
 * @param values 문자열 배열
 * @returns 중복이 제거된 배열
 */
function removeDuplicateValues(values: string[]): string[] {
  return [...new Set(values)];
}
