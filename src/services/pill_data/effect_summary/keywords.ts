/**
 * 효능 키워드 추출
 */
export function extractEffectKeywords(expression: string): string[] {
  const text = expression
    // 단어 중간의 동의어 괄호는 뒤의 명사 어근을 양쪽에 붙인다.
    .replace(/([가-힣]+)\(([가-힣]+)\)([가-힣]+)/g, "$1$3,$2$3")
    // 설명용 각주, 용량 및 분류 표시는 효능 키워드가 아니다.
    .replace(/\(\s*\d+\s*\)/g, ",")
    .replace(/\b(?:type|class)\s+[a-z0-9Ⅰ-ⅩⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|㎎|밀리그램|kg\/m²)\b/gi, "")
    .replace(/(?:으로|로|에)\s*(?:인한|의한|의하여|따른|기인한)/g, ",")
    .replace(
      /(?:과|와|에)?\s*(?:관련된|동반된|동반하는|수반하는|수반하거나|수반하지\s*않는)/g,
      ",",
    )
    .replace(/(?:을|를)?\s*(?:포함하는|포함한|포함하여|비롯한)/g, ",")
    .replace(/(?:을|를)?\s*(?:위한|위하여|위해)/g, ",")
    .replace(
      /(?:에\s*대한|에\s*대해|에\s*있어서|에\s*있어|에서의|에서|에게서|에게)/g,
      ",",
    )
    .replace(
      /([가-힣]+)(과|와)\s+/g,
      (match, noun: string, particle: string) => {
        const hasFinal = (noun.charCodeAt(noun.length - 1) - 0xac00) % 28 !== 0;

        return hasFinal === (particle === "과") ? noun + "," : match;
      },
    )
    .replace(/(?:의|을|를)\s+/g, ",")
    .replace(/(?:으로|로)\s+/g, ",")
    .replace(
      /\s*(?:조절이\s*안\s*될\s*경우|단기간의|단기간|급성악화시|함께)\s*/g,
      ",",
    )
    .replace(/\s+(?:후의|후)\s+/g, ",")
    .replace(/\s+(?:및|또는|혹은|그리고|또한|등의|등을|등에|등|포함)\s*/g, ",")
    .replace(
      /(?:다음(?:의)?\s*(?:질환|질병|증상|경우)(?:의|에)?|이\s*약(?:은|의|을)|기타|각종|특히)/g,
      "",
    )
    .replace(/[()[\]{}〈〉《》「」『』【】]/g, ",")
    .replace(/[,;:：·ㆍ/\n]+/g, ",");

  return text.split(",").map(normalizeKeyword).filter(Boolean);
}

/**
 * 효능 키워드 정리
 */
function normalizeKeyword(value: string): string {
  let keyword = value
    .trim()
    .replace(/^(?:인|의|가|이)\s+/, "")
    .replace(/^[\s\d.)①②③④⑤⑥⑦⑧⑨⑩\-–—]+/, "")
    .trim();

  keyword = keyword
    .replace(
      /\s*(?:투여한다|사용한다|사용된다|복용한다|처방한다|사용할\s*수\s*있다)\s*$/,
      "",
    )
    .replace(
      /(치료|개선|완화|억제|예방|감소|조절)(?:한다|하며|하고|하여)$/,
      "$1",
    )
    .replace(
      /(?:의\s*)?(?:보조\s*치료|증상\s*치료|증상\s*완화|증상\s*개선|치료|개선|완화|억제|예방|감소|조절|보급)(?:을|를|에)?$/,
      "",
    )
    .replace(/(?:으로서|로서|으로써|로써|으로|로|의|을|를|에)$/, "")
    .replace(/\s+(?:등|포함|경우|대상)$/, "")
    .replace(/[.。]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  // 괄호 안의 해설이나 환자 조건을 별도 효능으로 노출하지 않는다.
  if (
    !/[가-힣a-z]/i.test(keyword) ||
    /(?:한다|된다|있다|없는|있는|않는|않은|위하여|위해|경우|환자|이상|미만|이하|초과)$/.test(
      keyword,
    ) ||
    /^(?:효능|효과|질환|질병|증상|보조제|보조치료|치료|예방|개선|완화|억제|감소|조절|보급|등|포함|본태성|신성|급성|만성|정제|경구|주사제|예|intolerant)$|^(?:NYHA|type|class)\b/i.test(
      keyword,
    )
  ) {
    return "";
  }

  return keyword;
}
