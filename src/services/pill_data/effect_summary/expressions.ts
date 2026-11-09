import { readEffectDocumentText } from "./document";
import {
  normalizeWhitespace,
  splitTopLevelSentences,
  splitTopLevelCommaClauses,
} from "./text";
import {
  removeEffectHeading,
  normalizeEffectExpression,
  rewriteEffectExpression,
  removeTrailingBoilerplate,
  trimDanglingEnding,
  isUsefulEffectExpression,
  isGuidanceExpression,
} from "./expression_rules";

/**
 * 문장별 효능 후보 추출
 */
function extractLineCandidates(line: string) {
  const content = removeEffectHeading(normalizeWhitespace(line));

  const isEmpty = content.length === 0;

  if (isEmpty) {
    return [];
  }

  // 수식어와 적응증을 연결하고, 독립적인 효능 나열만 쉼표로 분리한다.
  return splitTopLevelSentences(content)
    .filter((expression) => !isGuidanceExpression(expression))
    .map(rewriteEffectExpression)
    .flatMap((expression) => {
      const clauses = splitTopLevelCommaClauses(expression);
      const isIndependentList =
        clauses.length > 1 &&
        clauses.every(
          (clause) =>
            !/비타민|보급|의|경우|환자|다음|위한|으로|에서|및|또는|수반|동반|따른|인한|필요|이상|미만/.test(
              clause,
            ),
        );

      return isIndependentList ? clauses : [expression];
    });
}

/**
 * 효능 후보 수집
 */
function extractEffectCandidates(text: string) {
  let effectContext = "";
  const candidates: string[] = [];

  for (const line of text.split("\n")) {
    const heading = removeEffectHeading(line);

    const context =
      /^다음\s*(?:질환|질병)(?:\s*및\s*증상)?의?\s*(보조\s*치료|증상\s*완화|증상\s*개선)$/.exec(
        heading,
      );

    if (context) {
      effectContext = context[1].replace(/보조\s+치료/, "보조치료");
      continue;
    }

    candidates.push(
      ...extractLineCandidates(line).map((candidate) =>
        withEffectContext(candidate, effectContext),
      ),
    );
  }

  return candidates;
}

/**
 * 키워드 추출 전 효능 문구 수집
 */
export function collectEffectExpressions(eeDocData: string | null | undefined) {
  const effectText = readEffectDocumentText(eeDocData);

  return extractEffectCandidates(effectText)
    .filter((expression) => !isGuidanceExpression(expression))
    .map(normalizeEffectExpression)
    .map(rewriteEffectExpression)
    .map(removeTrailingBoilerplate)
    .map(trimDanglingEnding)
    .filter(isUsefulEffectExpression);
}

function withEffectContext(candidate: string, context: string) {
  return context && !candidate.includes(context)
    ? `${candidate}의 ${context}`
    : candidate;
}
