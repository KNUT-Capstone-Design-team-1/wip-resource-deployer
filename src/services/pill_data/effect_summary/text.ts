import type { SplitState } from "../types/effect_summary";

/**
 * 연속 공백 정리
 */
export function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 여는 괄호 확인
 */
function isOpeningBracket(char: string) {
  return "([{〈《「『【".includes(char);
}

/**
 * 닫는 괄호 확인
 */
function isClosingBracket(char: string) {
  return ")]}>〉》」』】".includes(char);
}

/**
 * 소수점 여부 확인
 */
function isDecimalPoint(text: string, index: number) {
  const previous = text[index - 1];
  const next = text[index + 1];

  return Boolean(previous && next && /\d/.test(previous) && /\d/.test(next));
}

/**
 * 유효 후보 추가
 */
function pushCandidate(result: string[], value: string) {
  const normalized = value.trim();

  const hasCandidate = Boolean(normalized);

  if (hasCandidate) {
    result.push(normalized);
  }
}

/**
 * 괄호 밖 구문 분리
 */
function collectBoundary(
  text: string,
  index: number,
  state: SplitState,
  isDelimiter: (text: string, index: number) => boolean,
) {
  const char = text[index];

  state.depth = isOpeningBracket(char) ? state.depth + 1 : state.depth;
  state.depth = isClosingBracket(char)
    ? Math.max(0, state.depth - 1)
    : state.depth;

  const isBoundary = state.depth === 0 && isDelimiter(text, index);

  if (!isBoundary) {
    return;
  }

  pushCandidate(state.parts, text.slice(state.start, index));
  state.start = index + 1;
}

/**
 * 최상위 구분자 분리
 */
function splitAtTopLevel(
  text: string,
  isDelimiter: (text: string, index: number) => boolean,
) {
  const state: SplitState = { start: 0, depth: 0, parts: [] };

  for (let index = 0; index < text.length; index += 1) {
    collectBoundary(text, index, state, isDelimiter);
  }

  pushCandidate(state.parts, text.slice(state.start));

  return state.parts;
}

/**
 * 괄호 밖 문장 분리
 */
export function splitTopLevelSentences(text: string) {
  return splitAtTopLevel(
    text,
    (value, index) =>
      value[index] === ";" ||
      value[index] === "。" ||
      (value[index] === "." && !isDecimalPoint(value, index)),
  );
}

/**
 * 괄호 밖 쉼표 분리
 */
export function splitTopLevelCommaClauses(text: string) {
  return splitAtTopLevel(text, (value, index) => value[index] === ",");
}

/**
 * 중복 효능 표현 제거
 */
export function removeDuplicateExpressions(expressions: string[]) {
  const seen = new Set<string>();

  return expressions.filter((expression) => {
    const key = expression.replace(/[\s·ㆍ\-–—]/g, "").toLowerCase();

    const isDuplicate = !key || seen.has(key);

    if (isDuplicate) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
