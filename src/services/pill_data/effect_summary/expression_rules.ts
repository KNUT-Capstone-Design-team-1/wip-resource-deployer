import { normalizeWhitespace } from "./text";

const REJECTED_EXPRESSIONS = new Set([
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

/**
 * 효능 제목 제거
 */
export function removeEffectHeading(text: string) {
  return text
    .replace(/^\d+(?:\.(?!\d)|\))\s*/, "")
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
    .replace(/^(?:효능[·ㆍ]?효과|효능 및 효과|효과)\s*[:：]?\s*/i, "")
    .replace(/^(?:유효균종|적응증)\s*[:：]?\s*/i, "")
    .trim();
}

/**
 * 효능 표현 정리
 */
export function normalizeEffectExpression(expression: string) {
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
export function rewriteEffectExpression(expression: string) {
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

  result = result.replace(
    /(단독|병용) 치료이(?=\s*(?:권장|추천))/g,
    "$1 치료가",
  );

  return normalizeWhitespace(result);
}

/**
 * 후행 각주·안내 제거
 */
export function removeTrailingBoilerplate(expression: string) {
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
export function trimDanglingEnding(expression: string) {
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
export function isUsefulEffectExpression(expression: string) {
  const isEmptyExpression = !expression || /^[-+\d.\s%]+$/.test(expression);

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

  const isRejectedHeading = REJECTED_EXPRESSIONS.has(compact);

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
 * 안내 문구 여부 확인
 */
export function isGuidanceExpression(expression: string) {
  if (
    /진단은|가이드라인에\s*따라|아래는.*체질량지수표|체질량지수는.*계산|(?:복용|투여|병용)하지\s*않|사용해야\s*한다|투여를\s*철회한다/.test(
      expression,
    )
  ) {
    return true;
  }

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
