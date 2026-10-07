import axios from "axios";
import logger from "./logger";

const FALLBACK_EFFECT_SUMMARY = "효능·효과 정보를 확인할 수 없습니다.";
const REQUEST_DELAY_MS = 200;
const RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_LENGTH = 80;

/**
 * 에러 정의: HTTP 429 Too Many Requests 대응 예외 클래스
 */
class RateLimitError extends Error {
  constructor(message = "HTTP 429 Too Many Requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * 지정된 시간(ms) 동안 대기(sleep)한다.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 문자열 배열 내 중복 요소를 제거하여 고유값 배열을 반환한다.
 */
function removeDuplicateValues(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * 연속된 공백 및 줄바꿈 문자를 단일 공백으로 치환하고 앞뒤 여백을 제거한다.
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 문자가 여는 괄호 계열인지 확인한다.
 */
function isOpeningBracket(char: string): boolean {
  return "([{〈《「『【".includes(char);
}

/**
 * 문자가 닫는 괄호 계열인지 확인한다.
 */
function isClosingBracket(char: string): boolean {
  return ")]}>〉》」』】".includes(char);
}

/**
 * 특정 인덱스의 마침표가 소수점(숫자 사이의 점)인지 여부를 판별한다.
 */
function isDecimalPoint(text: string, index: number): boolean {
  const previous = text[index - 1];
  const next = text[index + 1];
  return Boolean(previous && next && /\d/.test(previous) && /\d/.test(next));
}

/**
 * 후보 문자열의 공백을 제거한 뒤 유효한 경우 결과 배열에 추가한다.
 */
function pushCandidate(result: string[], value: string): void {
  const normalized = value.trim();
  if (normalized) result.push(normalized);
}

/**
 * HTML/XML 엔티티(명명 엔티티, 16진수/10진수 유니코드)를 일반 문자로 디코딩한다.
 */
function decodeHtmlEntities(text: string): string {
  const namedEntities: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };

  return text
    .replace(/&([a-z][a-z0-9]+);/gi, (match, name: string) => {
      return namedEntities[name.toLowerCase()] ?? match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    })
    .replace(/&#(\d+);/g, (match, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    });
}

/**
 * HTML/XML 태그, CDATA, HTML entity 및 글머리 기호(bullet)를 일반 텍스트로 정규화한다.
 */
function cleanHtml(raw: string | null | undefined): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return "";
  }

  let text = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<(?:br|\/p|\/div|\/li|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  text = decodeHtmlEntities(text)
    // PDF/웹 변환 과정에서 들어오는 특수 bullet을 줄바꿈으로 취급한다.
    .replace(/[•◦▪▫●○◎◇◆□■▶▷]/g, "\n")
    .replace(/\r\n?/g, "\n");

  return text
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * 텍스트 라인이 효능·효과가 아닌 섹션(용법/용량, 주의사항 등)인지 확인한다.
 */
function isNonEffectLine(line: string): boolean {
  if (!line) {
    return true;
  }

  const sectionHeadingPatterns = [
    /^용법(?:\s*·?\s*용량)?/,
    /^용량/,
    /^투여방법/,
    /^복용방법/,
    /^사용방법/,
    /^사용법/,
    /^주의사항/,
    /^주의/,
    /^금기/,
    /^경고/,
    /^신중투여/,
    /^이상반응/,
    /^부작용/,
    /^상호작용/,
    /^임상시험/,
    /^보관방법/,
    /^저장방법/,
    /^취급상주의/,
    /^첨가제/,
    /^성상/,
    /^포장단위/,
    /^보험/,
  ];

  if (sectionHeadingPatterns.some((pattern) => pattern.test(line))) {
    return true;
  }

  return [
    "환자에게만 투여",
    "환자에게 투여",
    "의사 또는 약사의 지시에 따라",
    "전문의의 처방",
  ].some((keyword) => line.includes(keyword));
}

/**
 * 효능·효과와 명백히 무관한 섹션 라인을 제거한다.
 */
function removeNonEffectLines(text: string): string {
  return text
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean)
    .filter((line) => !isNonEffectLine(line))
    .join("\n");
}

/**
 * 번호 매기기나 '효능·효과' 같은 제목성 머리말을 제거한다.
 */
function removeEffectHeading(text: string): string {
  return text
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
    .replace(/^(?:효능[·ㆍ]?효과|효능 및 효과|효과)\s*[:：]?\s*/i, "")
    .replace(/^유효균종\s*[:：]?\s*/i, "")
    .trim();
}

/**
 * 최상위 괄호 바깥의 문장 종결 부호(;, 。, .)를 기준으로 문장을 분리한다.
 */
function splitTopLevelSentences(text: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (isOpeningBracket(char)) depth += 1;
    if (isClosingBracket(char)) depth = Math.max(0, depth - 1);

    const isBoundary =
      depth === 0 &&
      (char === ";" ||
        char === "。" ||
        (char === "." && !isDecimalPoint(text, index)));

    if (isBoundary) {
      pushCandidate(result, text.slice(start, index));
      start = index + 1;
    }
  }

  pushCandidate(result, text.slice(start));
  return result;
}

/**
 * 최상위 괄호 바깥의 쉼표(,)를 기준으로 절을 분리한다.
 */
function splitTopLevelCommaClauses(text: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (isOpeningBracket(char)) depth += 1;
    if (isClosingBracket(char)) depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      const clause = text.slice(start, index).trim();
      if (clause) result.push(clause);
      start = index + 1;
    }
  }

  const last = text.slice(start).trim();
  if (last) result.push(last);
  return result;
}

/**
 * 줄/문장 단위는 유지하되 쉼표는 최상위 괄호 깊이를 고려하여 후보 구문을 추출한다.
 */
function extractEffectCandidates(text: string): string[] {
  const candidates: string[] = [];

  for (const line of text.split("\n")) {
    const normalizedLine = normalizeWhitespace(line);
    if (!normalizedLine) {
      continue;
    }

    const withoutHeading = removeEffectHeading(normalizedLine);
    if (!withoutHeading) {
      continue;
    }

    const sentences = splitTopLevelSentences(withoutHeading);
    for (const sentence of sentences) {
      const parts = splitTopLevelCommaClauses(sentence);
      candidates.push(...(parts.length > 1 ? parts : [sentence]));
    }
  }

  return candidates;
}

/**
 * 특수문자, 조사 및 불필요한 안내성 상투 표현을 정리한다.
 */
function normalizeEffectExpression(expression: string): string {
  let result = normalizeWhitespace(expression)
    .replace(/^(?:[-–—ㆍ•◦▪▫]+)\s*/, "")
    .replace(/^[,;:]+\s*/, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*:\s*/g, ": ")
    .trim();

  // "다음 질환의 보조치료"처럼 데이터 원문의 안내 문구를 자연스럽게 제거한다.
  result = result
    .replace(/^다음\s+(?:질환|질병)(?:\s*,\s*증상)?의\s+/, "")
    .replace(/^다음\s+(?:질환|질병),\s*(?:증상\s*)?/, "")
    .replace(/^다음\s+경우(?:의)?\s+/, "")
    .replace(/^이 약은\s+/, "")
    .replace(/^이 약의\s+/, "");

  return normalizeWhitespace(result);
}

/**
 * 식약처 원문의 문어체/투여 지시형 표현을 사용자 친화적 효능 표현으로 재구성한다.
 */
function rewriteEffectExpression(expression: string): string {
  let result = normalizeWhitespace(expression);

  // "다음 질환의 보조치료: A, B" -> "A, B의 보조치료"
  result = result.replace(
    /^다음\s+(?:질환|질병)(?:\s+및\s+증상)?의\s+보조치료\s*[:：]\s*(.+)$/,
    "$1의 보조치료",
  );

  // "다음 질환의 치료: A, B" -> "A, B의 치료"
  result = result.replace(
    /^다음\s+(?:질환|질병)(?:\s+및\s+증상)?의\s+(치료|개선|완화)\s*[:：]\s*(.+)$/,
    "$2의 $1",
  );

  // "... 혈당조절을 향상시키기 위해 ... 보조제로 투여한다"
  // 같은 규격 문구는 핵심 효과를 앞세워 읽기 쉽게 만든다.
  result = result.replace(
    /^(.+?)의\s+혈당조절을\s+향상시키기\s+위해\s+식사요법,\s*운동요법의\s+보조제로\s+투여한다$/,
    "$1의 혈당조절 개선을 위한 식사요법·운동요법 보조치료",
  );

  // "... 증상 완화를 위해 투여한다" -> "... 증상 완화"
  result = result.replace(
    /^(.+?)의\s+증상\s+(완화|개선)을\s+위해\s+투여한다$/,
    "$1의 증상 $2",
  );

  // 규제 문서의 "~하기 위해 투여한다"를 효능 중심 표현으로 정리한다.
  result = result.replace(/^(.+?)을\s+(?:위해|목적으로)\s+투여한다$/, "$1");
  result = result.replace(/^(.+?)를\s+(?:위해|목적으로)\s+투여한다$/, "$1");

  // 단독/병용요법 자체가 효능이 아니라 치료 방식임을 드러내되,
  // 원문의 의미는 유지한다.
  result = result.replace(/단독요법으로\s+투여한다/g, "단독 치료");
  result = result.replace(/병용요법으로\s+투여한다/g, "병용 치료");
  result = result.replace(/단독요법/g, "단독 치료");
  result = result.replace(/병용요법/g, "병용 치료");

  // "~의 보조제로 투여한다"는 사용자에게는 "~의 보조치료"가 더 자연스럽다.
  result = result.replace(/(.+?)의\s+보조제로\s+투여한다$/, "$1의 보조치료");

  // 의미 없는 종결형만 제거한다.
  result = result
    .replace(/\s+투여한다$/, "")
    .replace(/\s+사용한다$/, "")
    .replace(/\s+사용할\s+수\s+있다$/, "")
    .trim();

  return normalizeWhitespace(result);
}

/**
 * 문장 끝에 붙은 각주 번호나 불필요한 메타 정보 문구를 제거한다.
 */
function removeTrailingBoilerplate(expression: string): string {
  return expression
    .replace(/\s*\*\s*\d+[,.]?\s*$/g, "")
    .replace(/\s*[☆★]\s*국내임상시험결과\s*추가제출[^,;]*$/g, "")
    .replace(/\s*국내임상시험결과\s*추가제출[^,;]*$/g, "")
    .replace(/\s*\(?(?:의약품\s*)?재평가\s*진행\s*중\)?\s*$/g, "")
    .replace(/\s*[,;:]+\s*$/g, "")
    .trim();
}

/**
 * 문장이 조사/연결 표현으로 어색하게 끝나는 경우 마지막 미완성 표현을 제거한다.
 *
 * 예:
 * - "심혈관 질환의" -> "심혈관 질환"
 * - "질환의 치료로서" -> "질환의 치료"
 * - "증상의 개선을 위해" -> "증상의 개선"
 *
 * 효능·효과 자체에 포함될 수 있는 "치료", "개선", "완화", "감소" 등의
 * 명사형 표현은 유지하고, 문장을 끝내지 못하는 조사/연결어미만 제거한다.
 */
function trimDanglingEnding(expression: string): string {
  let result = normalizeWhitespace(expression);

  // 반복적으로 적용하여 "A의 B로서", "A를 위한" 같은 중첩된 미완성 표현도 정리한다.
  const danglingEndingPatterns = [
    /\s+(?:으로서|로서)$/,
    /\s+(?:으로써|로써)$/,
    /\s+(?:때문에|위해|위하여)$/,
    /\s+(?:및|또는|혹은|그리고|또한)$/,
    /\s+(?:에\s+대해|에\s+대한|에\s+관한|에\s+관하여)$/,
    /\s+(?:에서|에게|에게서|으로부터|까지|부터|보다|처럼|같이|만큼)$/,
    /\s+(?:으로|로)$/,
    /\s+(?:의|을|를|이|가|은|는|와|과|도|만|에|로부터|부터|까지)$/,
  ];

  let previous = "";
  while (result && result !== previous) {
    previous = result;

    for (const pattern of danglingEndingPatterns) {
      result = result.replace(pattern, "").trim();
    }
  }

  return result;
}

/**
 * 유의미한 효능·효과 표현인지 여부를 판별한다(제목, 무의미한 문구 배제).
 */
function isUsefulEffectExpression(expression: string): boolean {
  if (!expression) return false;

  const compact = expression.replace(/\s+/g, "");
  const rejectedExact = new Set([
    "유효균종",
    "효능·효과",
    "효능효과",
    "다음질환의증상완화",
    "다음질환의보조치료",
  ]);

  if (rejectedExact.has(compact)) return false;

  // 임상시험 결과/유효성 근거 자체는 환자가 알고 싶은 효능이 아니다.
  if (
    /^(?:이 약의)?유효성은|^임상적 증거는|^국내임상시험결과/.test(expression)
  ) {
    return false;
  }

  // 안내 문구만 남은 경우 제거한다.
  if (
    /^(?:이 약은|이 약의|투여한다|사용한다|사용할 수 있다)\s*$/.test(expression)
  ) {
    return false;
  }

  return true;
}

/**
 * 정규화된 키를 기반으로 중복되는 효능 표현을 제거한다.
 */
function removeDuplicateExpressions(expressions: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const expression of expressions) {
    const key = expression.replace(/[\s·ㆍ\-–—]/g, "").toLowerCase();

    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(expression);
  }

  return result;
}

/**
 * 각 효능 표현의 중요도를 점수화하여 반환한다.
 */
function scoreEffectExpression(expression: string): number {
  let score = 0;

  if (/치료|개선|완화|억제|예방|감소|제거|보조치료|조절|보급/.test(expression))
    score += 4;
  if (
    /질환|질병|증상|장애|염|통|고혈압|당뇨|비염|두통|기침|빈혈/.test(expression)
  )
    score += 2;
  if (/^\(?정제\)?$|^유효균종$/.test(expression)) score -= 10;
  if (/예:|예\)|임상적|유효성|재평가|추가제출/.test(expression)) score -= 5;
  if (/투여한다|사용한다|복용한다|처방한다/.test(expression)) score -= 2;
  if (/환자의|환자에서/.test(expression)) score += 1;
  if (expression.length < 4) score -= 3;

  return score;
}

/**
 * 효능 표현 목록을 중요도 점수 기준 내림차순으로 정렬한다.
 */
function rankEffectExpressions(expressions: string[]): string[] {
  return [...expressions].sort(
    (a, b) => scoreEffectExpression(b) - scoreEffectExpression(a),
  );
}

/**
 * 단일 표현이 최대 길이를 초과할 때 최상위 쉼표 단위로 가능한 범위까지만 압축한다.
 */
function compressLongExpression(expression: string, maxLength: number): string {
  // 쉼표가 아니라 top-level 쉼표 기준으로 이미 분리했기 때문에
  // 여기서는 괄호/조건을 보존한 상태에서 의미 단위까지만 취한다.
  const clauses = splitTopLevelCommaClauses(expression);
  const fitting = clauses.filter((_, index) => {
    const candidate = clauses.slice(0, index + 1).join(", ");
    return candidate.length <= maxLength;
  });

  if (fitting.length > 0) {
    return fitting.join(", ");
  }

  // 하나의 원자적 의미 단위 자체가 길면 원문을 그대로 반환한다.
  // 데이터 손상보다 길이 초과가 낫다.
  return expression;
}

/**
 * 여러 효능 후보를 최대 길이에 맞추어 하나의 문자열로 압축·결합한다.
 */
function compressEffect(expressions: string[], maxLength: number): string {
  if (expressions.length === 0) {
    return "";
  }

  const summary: string[] = [];
  for (const expression of rankEffectExpressions(expressions)) {
    const candidate = summary.length
      ? `${summary.join(", ")}, ${expression}`
      : expression;

    if (candidate.length <= maxLength) {
      summary.push(expression);
      continue;
    }

    if (summary.length > 0) {
      break;
    }

    // 첫 후보가 길더라도 단순 substring으로 자르지 않는다.
    return compressLongExpression(expression, maxLength);
  }

  return summary.join(", ") || expressions[0];
}

/**
 * EE_DOC_DATA XML 원문을 파싱 및 정제하여 사용자용 한 줄 요약으로 생성한다.
 */
function createEffectSummary(
  eeDocData: string | null | undefined,
  maxLength = DEFAULT_MAX_LENGTH,
): string {
  const cleaned = cleanHtml(eeDocData);
  if (!cleaned) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  const effectText = removeNonEffectLines(cleaned);
  const candidates = extractEffectCandidates(effectText)
    .map(normalizeEffectExpression)
    .map(rewriteEffectExpression)
    .filter(isUsefulEffectExpression)
    .map(removeTrailingBoilerplate)
    .map(trimDanglingEnding)
    .filter(Boolean);

  const uniqueCandidates = removeDuplicateExpressions(candidates);
  return compressEffect(uniqueCandidates, maxLength) || FALLBACK_EFFECT_SUMMARY;
}

/**
 * Nedrug API로부터 ITEM_SEQ의 효능·효과 XML 문서(EE) 원본 데이터를 가져온다.
 */
async function fetchEeDocData(
  itemSeq: string,
  timeoutMs = 5000,
): Promise<string> {
  const url = `https://nedrug.mfds.go.kr/pbp/cmn/xml/drb/${itemSeq}/EE`;

  try {
    const response = await axios.get<string>(url, { timeout: timeoutMs });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 429) {
      throw new RateLimitError(`HTTP 429: ${itemSeq}`);
    }

    logger.error(
      `[EE-SUMMARY] Failed ITEM_SEQ=${itemSeq}. error: ${error?.message || error}`,
    );
    return "";
  }
}

/**
 * 단일 ITEM_SEQ에 대한 효능·효과 데이터를 조회하고 한 줄 요약을 생성한다.
 */
async function fetchEffectSummary(itemSeq: string): Promise<string> {
  const eeDocData = await fetchEeDocData(itemSeq);
  if (!eeDocData) {
    logger.warn(`[EE-SUMMARY] Empty EE_DOC_DATA: ${itemSeq}`);
    return FALLBACK_EFFECT_SUMMARY;
  }

  return createEffectSummary(eeDocData);
}

/**
 * 예외 처리를 포함하여 효능·효과 요약을 안전하게 조회하며, Rate Limit(429) 여부를 감지한다.
 */
async function fetchEffectSummarySafely(
  itemSeq: string,
  isRetry: boolean,
): Promise<{ summary: string; isRateLimited: boolean }> {
  try {
    return {
      summary: await fetchEffectSummary(itemSeq),
      isRateLimited: false,
    };
  } catch (error: any) {
    const isRateLimited = error instanceof RateLimitError;

    if (isRateLimited && !isRetry) {
      logger.warn(`[EE-SUMMARY] HTTP 429 ITEM_SEQ=${itemSeq}. Deferred retry.`);
      return { summary: FALLBACK_EFFECT_SUMMARY, isRateLimited: true };
    }

    logger.error(
      "[EE-SUMMARY] Failed ITEM_SEQ=%s. error: %s",
      itemSeq,
      error?.message || error,
    );

    return { summary: FALLBACK_EFFECT_SUMMARY, isRateLimited: false };
  }
}

/**
 * Rate Limit(429)으로 실패했던 ITEM_SEQ들을 대기 후 재시도 처리한다.
 */
async function retryRateLimitedItemSeqs(
  itemSeqs: Set<string>,
  summaryMap: Map<string, string>,
): Promise<Map<string, string>> {
  const retryItemSeqs = [...itemSeqs];

  if (retryItemSeqs.length === 0) {
    return summaryMap;
  }

  logger.info(
    `[EE-SUMMARY] Deferred retry start: ${retryItemSeqs.length} ITEM_SEQ`,
  );
  await sleep(RETRY_DELAY_MS);

  for (let index = 0; index < retryItemSeqs.length; index += 1) {
    if (index > 0) {
      await sleep(REQUEST_DELAY_MS);
    }

    const itemSeq = retryItemSeqs[index];
    const result = await fetchEffectSummarySafely(itemSeq, true);

    // 최초 요청에서 429가 발생했더라도 재시도 결과를 그대로 Map에 반영한다.
    summaryMap.set(itemSeq, result.summary);

    logger.info(
      `[EE-SUMMARY] Retry result ITEM_SEQ=${itemSeq}: ${result.summary}`,
    );
  }

  logger.info(
    `[EE-SUMMARY] Deferred retry complete: ${retryItemSeqs.length} ITEM_SEQ`,
  );

  // 재시도에서 갱신된 결과가 포함된 Map을 호출부로 반환한다.
  return summaryMap;
}

/**
 * 단일 배치 내 ITEM_SEQ들을 지연시간을 두고 순차 조회하여 Map에 저장한다.
 */
async function processEffectSummaryBatch(
  itemSeqs: string[],
  summaryMap: Map<string, string>,
  rateLimitedItemSeqs: Set<string>,
): Promise<void> {
  for (let index = 0; index < itemSeqs.length; index += 1) {
    if (index > 0) {
      await sleep(REQUEST_DELAY_MS);
    }

    const itemSeq = itemSeqs[index];
    const result = await fetchEffectSummarySafely(itemSeq, false);

    summaryMap.set(itemSeq, result.summary);
    if (result.isRateLimited) {
      rateLimitedItemSeqs.add(itemSeq);
    }
  }
}

/**
 * Nedrug ITEM_SEQ 목록을 배치 단위로 순차 처리하여 효능·효과 요약 Map을 생성한다.
 */
export async function fetchEffectSummaryMap(
  itemSeqList: string[],
  batchSize = 5,
): Promise<Map<string, string>> {
  const summaryMap = new Map<string, string>();
  const rateLimitedItemSeqs = new Set<string>();
  const itemSeqs = removeDuplicateValues(itemSeqList.filter(Boolean));

  if (itemSeqs.length === 0) {
    return summaryMap;
  }

  for (let start = 0; start < itemSeqs.length; start += batchSize) {
    const batch = itemSeqs.slice(start, start + batchSize);

    await processEffectSummaryBatch(batch, summaryMap, rateLimitedItemSeqs);

    const completed = Math.min(start + batchSize, itemSeqs.length);
    if (completed % 100 === 0 || completed === itemSeqs.length) {
      logger.info(`[EE-SUMMARY] ${completed} / ${itemSeqs.length}`);
    }
  }

  // 429 재시도에서 갱신된 Map을 반환받아 최종 결과로 사용한다.
  return await retryRateLimitedItemSeqs(rateLimitedItemSeqs, summaryMap);
}
