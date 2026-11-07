import type { SplitState } from "../types/effect_summary";
import { extractEffectKeywords } from "./keywords";
export const FALLBACK_EFFECT_SUMMARY = "효능·효과 정보가 없습니다.";
const DEFAULT_MAX_LENGTH = 80;

/**
 * 연속 공백 정리
 */
function normalizeWhitespace(text: string) {
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
 * HTML 엔티티 복원
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

  let decoded = text;

  // &amp;nbsp;처럼 중첩 인코딩된 엔티티도 제한된 횟수 안에서 해석한다.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const previous = decoded;
    decoded = decoded
      .replace(/&([a-z][a-z0-9]+);/gi, (match, name: string) => {
        return namedEntities[name.toLowerCase()] ?? match;
      })
      .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
        const codePoint = Number.parseInt(hex, 16);

        return Number.isInteger(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      })
      .replace(/&#(\d+);/g, (match, decimal: string) => {
        const codePoint = Number.parseInt(decimal, 10);

        return Number.isNaN(codePoint)
          ? match
          : String.fromCodePoint(codePoint);
      });

    if (decoded === previous) {
      break;
    }
  }

  return decoded;
}

/**
 * 태그·문서 장식 제거
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
    .replace(
      /<(?:br|\/p|\/paragraph|\/div|\/li|\/section|\/article)[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ");

  text = decodeHtmlEntities(text)
    .replace(/<\/?(?:sub|sup|b|strong|em|span)\b[^>]*>/gi, "")
    // PDF/웹 변환 과정에서 들어오는 특수 bullet을 줄바꿈으로 취급한다.
    .replace(/[•◦▪▫●○◎◇◆□■▶▷]/g, "\n")
    .replace(/\r\n?/g, "\n");

  return text
    .replace(/급\s*[.·ㆍ]\s*만성/g, "급·만성")
    .replace(/뼈\s*[,.]\s*이의/g, "뼈·이의")
    .replace(/([ABC]형)\s*,\s*(?=니만[-\s]*피크)/g, "$1 ")
    .replace(/위\s*,\s*십이지장/g, "위·십이지장")
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * 효능 외 항목 확인
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

  const isSectionHeading = sectionHeadingPatterns.some((pattern) =>
    pattern.test(line),
  );

  if (isSectionHeading) {
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
 * 효능 외 항목 제거
 */
function removeNonEffectLines(text: string) {
  let isOrganismSection = false;

  return text
    .split("\n")
    .map(normalizeWhitespace)
    .filter((line) => {
      const heading = line.replace(/^\d+[.)]\s*/, "");

      if (/^유효균종/.test(line)) {
        isOrganismSection = true;

        return false;
      }

      if (/^적응증(?:\s*[:：]|$)/.test(heading)) {
        isOrganismSection = false;

        return !/^적응증\s*[:：]?$/.test(heading);
      }

      return Boolean(line) && !isOrganismSection && !isNonEffectLine(line);
    })
    .join("\n");
}

/**
 * 효능 제목 제거
 */
function removeEffectHeading(text: string) {
  return text
    .replace(/^\d+(?:\.(?!\d)|\))\s*/, "")
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
    .replace(/^(?:효능[·ㆍ]?효과|효능 및 효과|효과)\s*[:：]?\s*/i, "")
    .replace(/^(?:유효균종|적응증)\s*[:：]?\s*/i, "")
    .trim();
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
function splitTopLevelSentences(text: string) {
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
function splitTopLevelCommaClauses(text: string) {
  return splitAtTopLevel(text, (value, index) => value[index] === ",");
}

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

    for (const candidate of extractLineCandidates(line)) {
      candidates.push(
        effectContext && !candidate.includes(effectContext)
          ? `${candidate}의 ${effectContext}`
          : candidate,
      );
    }
  }

  return candidates;
}

/**
 * 효능 표현 정리
 */
function normalizeEffectExpression(expression: string) {
  let result = normalizeWhitespace(expression)
    .replace(/^(?:[-–—·ㆍ․∙⦁•◦▪▫]+)\s*/, "")
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
 * 효능 표현 재구성
 */
function rewriteEffectExpression(expression: string) {
  let result = normalizeWhitespace(expression).replace(
    /^다음\s*경우(?:의)?\s+/,
    "",
  );

  // 적응 대상과 보조요법 조건을 함께 보존한다.
  result = result.replace(
    /^(.+?)의\s+혈당조절을\s+(?:개선|향상)시키기\s*위해\s+식사요법\s*(?:,|및|·)\s*운동요법(?:의)?\s+보조제로(?:서)?$/,
    "$1의 혈당조절 개선(식사요법·운동요법 보조치료)",
  );

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
  result = result.replace(/단독요법으로/g, "단독 치료로");
  result = result.replace(/병용요법으로/g, "병용 치료로");
  result = result.replace(/단독요법/g, "단독 치료");
  result = result.replace(/병용요법/g, "병용 치료");

  result = result.replace(
    /증상을\s+다음과\s+같이\s+개선하기\s+위해\s+사용한다$/,
    "증상 개선",
  );

  // 투여 지시를 지워 목적어만 남기지 않고 보조치료 표현으로 마무리한다.
  result = result.replace(
    /보조제로서\s*,?\s*이\s*약을\s+투여한다$/,
    "보조치료",
  );
  result = result.replace(/경우\s+이\s*약을\s+투여한다$/, "경우의 치료");

  // "~의 보조제로 투여한다"는 사용자에게는 "~의 보조치료"가 더 자연스럽다.
  result = result.replace(
    /(.+?)의\s+보조제로\s+(?:투여한다|사용한다|사용된다)$/,
    "$1의 보조치료",
  );
  result = result.replace(/보조제로서$/, "보조치료");
  result = result.replace(/(?:에|으로)\s+사용된다$/, "");
  result = result.replace(/\s+사용된다$/, "");
  result = result.replace(
    /(?:을|를)\s+(치료|개선|완화|억제|예방|감소|조절)한다$/,
    " $1",
  );
  result = result.replace(/(치료|개선|완화|억제|예방|감소|조절)한다$/, "$1");

  // 의미 없는 종결형만 제거한다.
  result = result
    .replace(/\s+투여한다$/, "")
    .replace(/\s+사용한다$/, "")
    .replace(/\s+사용할\s+수\s+있다$/, "")
    .trim();

  return normalizeWhitespace(result);
}

/**
 * 후행 각주·안내 제거
 */
function removeTrailingBoilerplate(expression: string) {
  return expression
    .replace(/\s*\*\s*\d+[,.]?\s*$/g, "")
    .replace(/\s*[☆★]\s*국내임상시험결과\s*추가제출[^,;]*$/g, "")
    .replace(/\s*국내임상시험결과\s*추가제출[^,;]*$/g, "")
    .replace(/\s*\(?(?:의약품\s*)?재평가\s*진행\s*중\)?\s*$/g, "")
    .replace(/\s*[,;:]+\s*$/g, "")
    .trim();
}

/**
 * 미완성 조사·연결어 제거
 */
function trimDanglingEnding(expression: string) {
  let result = normalizeWhitespace(expression);

  // 효능 동작이 분명할 때만 연결 어미를 명사형으로 정리한다.
  result = result.replace(
    /(치료|개선|완화|억제|예방|감소|조절)(?:하며|하고|하여)$/,
    "$1",
  );

  result = result.replace(
    /(치료|개선|완화|억제|예방|감소|조절)(?:에|하기)$/,
    "$1",
  );

  // 반복적으로 적용하여 "A의 B로서", "A를 위한" 같은 중첩된 미완성 표현도 정리한다.
  result = result
    .replace(/병용\s*(?:하며|하고)$/, "병용")
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
 * 유효 효능 표현 확인
 */
function isUsefulEffectExpression(expression: string) {
  const isEmptyExpression = !expression;

  if (isEmptyExpression) {
    return false;
  }

  if (
    /다음\s*(?:질환|질병)(?:에|의)?$/.test(expression) ||
    /삭제|유효성을\s*입증하지\s*못함/.test(expression)
  ) {
    return false;
  }

  if (
    /(?:하며|하고|하여|이며|이고|있으며|하므로|하면서|경우로)$/.test(expression)
  ) {
    return false;
  }

  if (
    /^(?:\([^)]*\)\s*)+$/.test(expression) ||
    /^\*?\s*\d+(?:\.\d+)?\s*(?:mg|㎎|밀리그램)$/i.test(expression)
  ) {
    return false;
  }

  const compact = expression.replace(/\s+/g, "");
  const rejectedExact = new Set([
    "유효균종",
    "효능·효과",
    "효능효과",
    "다음질환의증상완화",
    "다음질환의보조치료",
    "증상완화",
    "증상개선",
    "보조치료",
    "치료",
    "예방",
    "주효능",
    "기",
    "급",
    "급성",
    "&nbsp",
    "적응증",
    "주효능·효과",
    "주효능효과",
    "주효능ㆍ효과",
  ]);

  const isRejectedHeading = rejectedExact.has(compact);

  if (isRejectedHeading) {
    return false;
  }

  if (/(?:이\s*약을|이\s*약은)$/.test(expression)) {
    return false;
  }

  // 임상시험 결과/유효성 근거 자체는 환자가 알고 싶은 효능이 아니다.
  const isEvidenceDescription =
    /^(?:이 약의)?유효성은|^임상적 증거는|^국내임상시험결과/.test(expression);

  if (isEvidenceDescription) {
    return false;
  }

  // 안내 문구만 남은 경우 제거한다.
  if (
    /^ACE억제제에\s+(?:대한\s+추가요법|내약성이)/.test(expression) ||
    /^다음\s*질환에서\s*혈전\s*생성\s*억제$/.test(expression)
  ) {
    return false;
  }

  const isInstructionOnly =
    /^(?:이 약은|이 약의|투여한다|사용한다|사용할 수 있다)\s*$/.test(
      expression,
    );

  if (isInstructionOnly) {
    return false;
  }

  return true;
}

/**
 * 중복 효능 표현 제거
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
 * 효능 키워드 길이 제한
 */
function compressEffect(keywords: string[], maxLength: number) {
  return keywords.reduce((summary, keyword) => {
    const candidate = summary ? summary + "," + keyword : keyword;

    return !summary || candidate.length <= maxLength ? candidate : summary;
  }, "");
}

/**
 * 안내 문구 여부 확인
 */
function isGuidanceExpression(expression: string) {
  if (
    /이\s*약(?:을)?\s*투여에?\s*앞서|이\s*약에\s*함유된.*효능|확인하여야|배제해야|측정해야|측정하여야|검사시에는|검사\s*시에는/.test(
      expression,
    )
  ) {
    return true;
  }

  return (
    /위험\s*인자.*고려해야|전반적인?\s*위험성|위험성을?\s*평가해야|체질량지수.*계산|성적\s*자극.*필요로|효과적이려면|선택성\s*COX-2\s*억제제인.*투여하는\s*경우/.test(
      expression,
    ) ||
    /^(?:다른\s*식욕억제제와|여성에\s*의한\s*사용을)/.test(expression) ||
    /^(?:평가해야\s*한다|고려해야\s*한다)$/.test(expression)
  );
}

/**
 * 키워드 추출 전 효능 문구 수집
 */
function collectEffectExpressions(eeDocData: string | null | undefined) {
  const effectText = removeNonEffectLines(cleanHtml(eeDocData));

  return extractEffectCandidates(effectText)
    .filter((expression) => !isGuidanceExpression(expression))
    .map(normalizeEffectExpression)
    .map(rewriteEffectExpression)
    .map(removeTrailingBoilerplate)
    .map(trimDanglingEnding)
    .filter(isUsefulEffectExpression);
}

/**
 * 수식어와 적응 조건을 보존한 줄글 효능 요약 생성
 */
export function createEffectSummary(eeDocData: string | null | undefined) {
  const expressions = removeDuplicateExpressions(
    collectEffectExpressions(eeDocData),
  );

  return expressions.join(". ") || FALLBACK_EFFECT_SUMMARY;
}

/**
 * 효능 키워드 생성
 */
export function createEffectKeyword(
  eeDocData: string | null | undefined,
  maxLength = DEFAULT_MAX_LENGTH,
) {
  const keywords = removeDuplicateExpressions(
    collectEffectExpressions(eeDocData).flatMap(extractEffectKeywords),
  );

  return compressEffect(keywords, maxLength) || FALLBACK_EFFECT_SUMMARY;
}

/**
 * 기존 효능 원문 보존
 */
export function existingEffectText(document: string | null | undefined) {
  return cleanHtml(document) || FALLBACK_EFFECT_SUMMARY;
}
