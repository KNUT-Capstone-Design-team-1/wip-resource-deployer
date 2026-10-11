import type { EffectScoreRule } from "../types/effect_summary";
import type { SplitState, SummaryState } from "../types/effect_summary";
export const FALLBACK_EFFECT_SUMMARY = "효능·효과 정보가 없습니다.";
const DEFAULT_MAX_LENGTH = 80;

/**
 * 연속된 공백 및 줄바꿈 문자를 단일 공백으로 치환하고 앞뒤 여백을 제거한다.
 */
function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 문자가 여는 괄호 계열인지 확인한다.
 */
function isOpeningBracket(char: string) {
  return "([{〈《「『【".includes(char);
}

/**
 * 문자가 닫는 괄호 계열인지 확인한다.
 */
function isClosingBracket(char: string) {
  return ")]}>〉》」』】".includes(char);
}

/**
 * 특정 인덱스의 마침표가 소수점(숫자 사이의 점)인지 여부를 판별한다.
 */
function isDecimalPoint(text: string, index: number) {
  const previous = text[index - 1];
  const next = text[index + 1];

  return Boolean(previous && next && /\d/.test(previous) && /\d/.test(next));
}

/**
 * 후보 문자열의 공백을 제거한 뒤 유효한 경우 결과 배열에 추가한다.
 */
function pushCandidate(result: string[], value: string) {
  const normalized = value.trim();
  const hasCandidate = Boolean(normalized);

  if (hasCandidate) {
    result.push(normalized);
  }
}

/**
 * HTML/XML 엔티티(명명 엔티티, 16진수/10진수 유니코드)를 일반 문자로 디코딩한다.
 */
function decodeHtmlEntities(text: string) {
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
function cleanHtml(raw: string | null | undefined) {
  const isEmptyInput = typeof raw !== "string" || !raw.trim();

  if (isEmptyInput) {
    return "";
  }

  let text = raw
    // 효능 XML은 본문 없이 ARTICLE/SECTION의 title 속성에 내용을 담기도 한다.
    .replace(/<(?:article|section)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
      const title = /\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
      return title ? `\n${title[1] ?? title[2]}\n` : "\n";
    })
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<(?:br|\/p|\/div|\/li|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  text = decodeHtmlEntities(text)
    // PDF/웹 변환 과정에서 들어오는 특수 bullet을 줄바꿈으로 취급한다.
    .replace(/[•◦▪▫●○◎◇◆□■▶▷]/g, "\n")
    .replace(/\r\n?/g, "\n");

  return text .split("\n") .map(normalizeWhitespace) .filter(Boolean) .join("\n") .trim();
}

/**
 * 텍스트 라인이 효능·효과가 아닌 섹션(용법/용량, 주의사항 등)인지 확인한다.
 */
function isNonEffectLine(line: string) {
  const isEmptyLine = !line;

  if (isEmptyLine) {
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
  const isSectionHeading = sectionHeadingPatterns.some((pattern) => pattern.test(line));

  if (isSectionHeading) {
    return true;
  }

  return ["환자에게만 투여", "환자에게 투여", "의사 또는 약사의 지시에 따라", "전문의의 처방",].some((keyword) => line.includes(keyword));
}

/**
 * 효능·효과와 명백히 무관한 섹션 라인을 제거한다.
 */
function removeNonEffectLines(text: string) {
  return text .split("\n") .map(normalizeWhitespace) .filter(Boolean)
    .filter((line) => !isNonEffectLine(line))
    .join("\n");
}

/**
 * 번호 매기기나 '효능·효과' 같은 제목성 머리말을 제거한다.
 */
function removeEffectHeading(text: string) {
  return text .replace(/^\d+(?:\.(?!\d)|\))\s*/, "") .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
    .replace(/^(?:효능[·ㆍ]?효과|효능 및 효과|효과)\s*[:：]?\s*/i, "")
    .replace(/^유효균종\s*[:：]?\s*/i, "")
    .trim();
}

/**
 * 괄호 깊이를 갱신하고 괄호 밖의 구분자에서 후보 문자열을 분리한다.
 */
function collectBoundary(text: string, index: number, state: SplitState, isDelimiter: (text: string, index: number) => boolean) {
  const char = text[index];

  state.depth = isOpeningBracket(char)
    ? state.depth + 1
    : state.depth;
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
 * 괄호 안의 구분자를 보존하면서 최상위 구분자를 기준으로 문자열을 나눈다.
 */
function splitAtTopLevel(text: string, isDelimiter: (text: string, index: number) => boolean) {
  const state: SplitState = { start: 0, depth: 0, parts: [] };

  for (let index = 0; index < text.length; index += 1) {
    collectBoundary(text, index, state, isDelimiter);
  }

  pushCandidate(state.parts, text.slice(state.start));

  return state.parts;
}

/**
 * 소수점을 보존하면서 괄호 밖의 문장 구분자를 기준으로 문장을 나눈다.
 */
function splitTopLevelSentences(text: string) {
  return splitAtTopLevel(text, (value, index) => value[index] === ";" ||
    value[index] === "。" ||
    (value[index] === "." && !isDecimalPoint(value, index)));
}

/**
 * 최상위 괄호 바깥의 쉼표(,)를 기준으로 절을 분리한다.
 */
function splitTopLevelCommaClauses(text: string) {
  return splitAtTopLevel(text, (value, index) => value[index] === ",");
}

/**
 * 줄/문장 단위는 유지하되 쉼표는 최상위 괄호 깊이를 고려하여 후보 구문을 추출한다.
 */
function extractLineCandidates(line: string) {
  const content = removeEffectHeading(normalizeWhitespace(line));
  const isEmpty = content.length === 0;

  if (isEmpty) {
    return [];
  }

  return splitTopLevelSentences(content) .map(rewriteEffectExpression)
    .flatMap(splitTopLevelCommaClauses);
}

/**
 * 효능 문서를 줄 단위로 분석해 요약 후보 표현을 수집한다.
 */
function extractEffectCandidates(text: string) {
  return text.split("\n").flatMap(extractLineCandidates);
}

/**
 * 특수문자, 조사 및 불필요한 안내성 상투 표현을 정리한다.
 */
function normalizeEffectExpression(expression: string) {
  let result = normalizeWhitespace(expression) .replace(/^(?:[-–—ㆍ•◦▪▫]+)\s*/, "")
    .replace(/^[,;:]+\s*/, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*:\s*/g, ": ")
    .trim();

  // "다음 질환의 보조치료"처럼 데이터 원문의 안내 문구를 자연스럽게 제거한다.
  result = result .replace(/^다음\s+(?:질환|질병)(?:\s*,\s*증상)?의\s+/, "")
    .replace(/^다음\s+(?:질환|질병),\s*(?:증상\s*)?/, "")
    .replace(/^다음\s+경우(?:의)?\s+/, "")
    .replace(/^이 약은\s+/, "")
    .replace(/^이 약의\s+/, "");

  return normalizeWhitespace(result);
}

/**
 * 식약처 원문의 문어체/투여 지시형 표현을 사용자 친화적 효능 표현으로 재구성한다.
 */
function rewriteEffectExpression(expression: string) {
  let result = normalizeWhitespace(expression);

  // 적응 대상과 보조요법 조건을 함께 보존한다.
  result = result.replace(
    /^(.+?)의\s+혈당조절을\s+(?:개선|향상)시키기\s*위해\s+식사요법\s*(?:,|및|·)\s*운동요법(?:의)?\s+보조제로(?:서)?$/,
    "$1의 혈당조절 개선(식사요법·운동요법 보조치료)"
  );

  // "다음 질환의 보조치료: A, B" -> "A, B의 보조치료"
  result = result.replace(/^다음\s+(?:질환|질병)(?:\s+및\s+증상)?의\s+보조치료\s*[:：]\s*(.+)$/, "$1의 보조치료");

  // "다음 질환의 치료: A, B" -> "A, B의 치료"
  result = result.replace(/^다음\s+(?:질환|질병)(?:\s+및\s+증상)?의\s+(치료|개선|완화)\s*[:：]\s*(.+)$/, "$2의 $1");

  // "... 혈당조절을 향상시키기 위해 ... 보조제로 투여한다"
  // 같은 규격 문구는 핵심 효과를 앞세워 읽기 쉽게 만든다.
  result = result.replace(
    /^(.+?)의\s+혈당조절을\s+향상시키기\s+위해\s+식사요법,\s*운동요법의\s+보조제로\s+투여한다$/,
    "$1의 혈당조절 개선을 위한 식사요법·운동요법 보조치료"
  );

  // "... 증상 완화를 위해 투여한다" -> "... 증상 완화"
  result = result.replace(/^(.+?)의\s+증상\s+(완화|개선)을\s+위해\s+투여한다$/, "$1의 증상 $2");

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
  result = result.replace(/(.+?)의\s+보조제로\s+(?:투여한다|사용한다|사용된다)$/, "$1의 보조치료");
  result = result.replace(/보조제로서$/, "보조치료");
  result = result.replace(/(?:에|으로)\s+사용된다$/, "");
  result = result.replace(/\s+사용된다$/, "");
  result = result.replace(/(?:을|를)\s+(치료|개선|완화|억제|예방|감소|조절)한다$/, " $1");
  result = result.replace(/(치료|개선|완화|억제|예방|감소|조절)한다$/, "$1");

  // 의미 없는 종결형만 제거한다.
  result = result .replace(/\s+투여한다$/, "") .replace(/\s+사용한다$/, "")
    .replace(/\s+사용할\s+수\s+있다$/, "")
    .trim();

  return normalizeWhitespace(result);
}

/**
 * 문장 끝에 붙은 각주 번호나 불필요한 메타 정보 문구를 제거한다.
 */
function removeTrailingBoilerplate(expression: string) {
  return expression .replace(/\s*\*\s*\d+[,.]?\s*$/g, "")
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
function trimDanglingEnding(expression: string) {
  let result = normalizeWhitespace(expression);

  // 반복적으로 적용하여 "A의 B로서", "A를 위한" 같은 중첩된 미완성 표현도 정리한다.
  result = result .replace(/병용\s*(?:하며|하고)$/, "병용")
    .replace(/(치료|요법|요법제|대체요법|보조제)(?:으로|로)$/, "$1")
    .replace(/(폐경여성|환자|성인|소아)에서$/, "$1 대상")
    .replace(/을\s*목적으로$/, "")
    .replace(/를\s*목적으로$/, "");

  const danglingEndingPatterns = [
    /(?:으로서|로서)$/,
    /(?:으로써|로써)$/,
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
function isUsefulEffectExpression(expression: string) {
  const isEmptyExpression = !expression;

  if (isEmptyExpression) {
    return false;
  }

  if (/다음\s*(?:질환|질병)(?:에|의)?$/.test(expression) || /삭제|유효성을\s*입증하지\s*못함/.test(expression)) {
    return false;
  }

  const compact = expression.replace(/\s+/g, "");
  const rejectedExact = new Set(["유효균종", "효능·효과", "효능효과", "다음질환의증상완화", "다음질환의보조치료",]);
  const isRejectedHeading = rejectedExact.has(compact);

  if (isRejectedHeading) {
    return false;
  }

  // 임상시험 결과/유효성 근거 자체는 환자가 알고 싶은 효능이 아니다.
  const isEvidenceDescription = /^(?:이 약의)?유효성은|^임상적 증거는|^국내임상시험결과/.test(expression);

  if (isEvidenceDescription) {
    return false;
  }

  // 안내 문구만 남은 경우 제거한다.
  const isInstructionOnly = /^(?:이 약은|이 약의|투여한다|사용한다|사용할 수 있다)\s*$/.test(expression);

  if (isInstructionOnly) {
    return false;
  }

  return true;
}

/**
 * 정규화된 키를 기반으로 중복되는 효능 표현을 제거한다.
 */
function removeDuplicateExpressions(expressions: string[]) {
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

/**
 * 각 효능 표현의 중요도를 점수화하여 반환한다.
 */
const EFFECT_SCORE_RULES: EffectScoreRule[] = [
  { pattern: /치료|개선|완화|억제|예방|감소|제거|보조치료|조절|보급/, score: 4 },
  { pattern: /질환|질병|증상|장애|염|통|고혈압|당뇨|비염|두통|기침|빈혈/, score: 2 },
  { pattern: /^\(?정제\)?$|^유효균종$/, score: -10 },
  { pattern: /예:|예\)|임상적|유효성|재평가|추가제출/, score: -5 },
  { pattern: /투여한다|사용한다|복용한다|처방한다/, score: -2 },
  { pattern: /환자의|환자에서/, score: 1 },
];

/**
 * 효능 표현에 점수 규칙과 짧은 표현의 감점을 적용한다.
 */
function scoreEffectExpression(expression: string) {
  const score = EFFECT_SCORE_RULES.reduce(
    (total, rule) => total + (rule.pattern.test(expression) ? rule.score : 0),
    0
  );

  return score + (expression.length < 4 ? -3 : 0);
}

/**
 * 효능 표현 목록을 중요도 점수 기준 내림차순으로 정렬한다.
 */
function rankEffectExpressions(expressions: string[]) {
  return expressions
    .map((expression) => ({ expression, score: scoreEffectExpression(expression) }))
    .sort((left, right) => right.score - left.score)
    .map(({ expression }) => expression);
}

/**
 * 단일 표현이 최대 길이를 초과할 때 최상위 쉼표 단위로 가능한 범위까지만 압축한다.
 */
function compressLongExpression(expression: string, maxLength: number) {
  const clauses = splitTopLevelCommaClauses(expression);
  let length = 0;
  const fitting = clauses.filter((clause, index) => {
    length += clause.length + (index > 0 ? 2 : 0);

    return length <= maxLength;
  });
  const hasFittingClauses = fitting.length > 0;

  if (hasFittingClauses) {
    return fitting.join(", ");
  }

  return expression;
}

/**
 * 길이 제한 안에서 요약 표현을 추가하고 제한을 넘으면 요약 조합을 중단한다.
 */
function appendSummary(state: SummaryState, expression: string, maxLength: number) {
  if (state.stopped) {
    return state;
  }

  const candidate = state.value ? state.value + ", " + expression : expression;
  const fits = candidate.length <= maxLength;

  if (fits) {
    return { value: candidate, stopped: false };
  }

  return {
    value: state.value || compressLongExpression(expression, maxLength),
    stopped: true,
  };
}

/**
 * 점수가 높은 효능 표현부터 길이 제한에 맞춰 요약 문자열을 만든다.
 */
function compressEffect(expressions: string[], maxLength: number) {
  const result = rankEffectExpressions(expressions).reduce(
    (state, expression) => appendSummary(state, expression, maxLength),
    {
      value: "",
      stopped: false
    }
  );

  return result.value || expressions[0] || "";
}

/**
 * 효능이 아닌 위험 평가, 계산식, 사용 조건만 설명하는 안내 구문을 구별한다.
 */
function isGuidanceExpression(expression: string) {
  return /위험\s*인자.*고려해야|전반적인?\s*위험성|위험성을?\s*평가해야|체질량지수.*계산|성적\s*자극.*필요로|효과적이려면|선택성\s*COX-2\s*억제제인.*투여하는\s*경우/.test(
    expression
  ) ||
    /^(?:다른\s*식욕억제제와|여성에\s*의한\s*사용을)/.test(expression) ||
    /^(?:평가해야\s*한다|고려해야\s*한다)$/.test(expression);
}

/**
 * EE_DOC_DATA XML 원문을 파싱 및 정제하여 사용자용 한 줄 요약으로 생성한다.
 */
export function createEffectSummary(eeDocData: string | null | undefined, maxLength = DEFAULT_MAX_LENGTH) {
  const cleaned = cleanHtml(eeDocData);
  const isEmptyText = !cleaned;

  if (isEmptyText) {
    return FALLBACK_EFFECT_SUMMARY;
  }

  const effectText = removeNonEffectLines(cleaned);
  const candidates = extractEffectCandidates(effectText)
    .filter((expression) => !isGuidanceExpression(expression))
    .map(normalizeEffectExpression)
    .map(rewriteEffectExpression)
    .filter(isUsefulEffectExpression)
    .map(removeTrailingBoilerplate)
    .map(trimDanglingEnding)
    .filter(isUsefulEffectExpression);
  const uniqueCandidates = removeDuplicateExpressions(candidates);

  return compressEffect(uniqueCandidates, maxLength) || FALLBACK_EFFECT_SUMMARY;
}

/**
 * 기존 효능·효과 원문을 유지하고 내용이 없으면 없음 문구를 반환한다.
 */
export function existingEffectText(document: string | null | undefined) {
  return cleanHtml(document) || FALLBACK_EFFECT_SUMMARY;
}
