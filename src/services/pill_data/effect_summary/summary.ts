import { cleanHtml } from "./document";
import { collectEffectExpressions } from "./expressions";
import { extractEffectKeywords } from "./keywords";
import { removeDuplicateExpressions } from "./text";

export const FALLBACK_EFFECT_SUMMARY = "효능·효과 정보가 없습니다.";
const DEFAULT_MAX_LENGTH = 80;

/**
 * 효능 키워드 길이 제한
 */
function compressEffect(keywords: string[], maxLength: number) {
  return keywords.reduce((summary, keyword) => {
    const candidate = summary ? summary + "," + keyword : keyword;

    return !summary || candidate.length <= maxLength ? candidate : summary;
  }, "");
}

/**
 * 수식어와 적응 조건을 보존한 줄글 효능 요약 생성
 */
export function createEffectSummary(eeDocData: string | null | undefined) {
  return summarizeExpressions(collectEffectExpressions(eeDocData));
}

/** 중복을 제거한 문구를 줄글로 연결한다. */
function summarizeExpressions(expressions: string[]) {
  return (
    removeDuplicateExpressions(expressions).join(". ") ||
    FALLBACK_EFFECT_SUMMARY
  );
}

/**
 * 효능 키워드 생성
 */
export function createEffectKeyword(
  eeDocData: string | null | undefined,
  maxLength = DEFAULT_MAX_LENGTH,
) {
  return keywordFromExpressions(collectEffectExpressions(eeDocData), maxLength);
}

/** 정제된 문구에서 키워드를 추출하고 출력 길이를 제한한다. */
function keywordFromExpressions(expressions: string[], maxLength: number) {
  const keywords = removeDuplicateExpressions(
    expressions.flatMap(extractEffectKeywords),
  );

  return compressEffect(keywords, maxLength) || FALLBACK_EFFECT_SUMMARY;
}

/**
 * 기존 효능 원문 보존
 */
export function existingEffectText(document: string | null | undefined) {
  return cleanHtml(document) || FALLBACK_EFFECT_SUMMARY;
}

/** 한 번 정제한 문구로 요약과 키워드를 함께 생성한다. */
export function createEffectDetails(
  document: string | null | undefined,
  maxLength = DEFAULT_MAX_LENGTH,
) {
  const expressions = collectEffectExpressions(document);
  return {
    summary: summarizeExpressions(expressions),
    keyword: keywordFromExpressions(expressions, maxLength),
  };
}
