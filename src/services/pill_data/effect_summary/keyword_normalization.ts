import { normalizeKeywordSynonym, isNonEffectKeyword } from "./keyword_rules";

/**
 * 효능 키워드 정리
 */
export function normalizeKeyword(value: string): string {
  let keyword = value
    .trim()
    .replace(/^(?:인|의|가|이)\s+/, "")
    .replace(/^\s*(?:\d+[.)]|[①②③④⑤⑥⑦⑧⑨⑩\-–—])\s*/, "")
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
      /(?:의\s*)?(?:보조\s*치료|증상\s*치료|증상\s*완화|증상\s*개선|치료제|치료|개선|완화|억제|예방|감소|조절|보급)(?:을|를|에)?$/,
      "",
    )
    .replace(/(?:의|을|를|에)$/, "")
    .replace(/\s+(?:으로서|로서|으로써|로써|으로|로)$/, "")
    .replace(/\s+(?:등|포함|경우|대상)$/, "")
    .replace(/[.。]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  keyword = keyword
    .replace(/^(?:가진|가지고|보인)(?:\s+|$)/, "")
    .replace(
      /^.*(?:조절되지\s*않는|반응하지\s*않는|반응이\s*적절하지\s*않은|상승되어\s*있는|필요한|요구되는|적합한|적절한|다중위험요소가\s*있는)\s*/,
      "",
    )
    .replace(
      /^(?:지속적으로|적절하게|상승된|낮은|낮추어|낮추고|동반한|같이)\s+/,
      "",
    )
    .replace(
      /^(?:성인|소아|청소년)\s+(?=(?:제\s*)?[12]형\s*당뇨병|주의력결핍)/,
      "",
    )
    .replace(/^제\s*([12])\s*형\s*당뇨병/, "$1형 당뇨병")
    .replace(/^([12])\s*형\s*당뇨병/, "$1형 당뇨병")
    .replace(/^비타민\s*([A-K])\s*(\d*)$/i, "비타민 $1$2")
    .replace(
      /\s+(?:증상|징후|재발방지|재발\s*예방|위험성?|발생)(?:\s*감소)?$/,
      "",
    )
    .replace(/체력저하시$/, "체력저하")
    .replace(/^(?:동반하거나\s*동반하지\s*않[은는])\s*/, "")
    .trim();

  keyword = normalizeKeywordSynonym(keyword);

  // 정도 수식어와 표기 차이는 같은 질환 키워드로 통일한다.
  // 급성·만성 등 질환을 구분하는 수식어는 보존한다.
  keyword = keyword
    .replace(/역류성\s*심도염/g, "역류성 식도염")
    .replace(/역류성\s*식도염/g, "역류성 식도염")
    .replace(/^(?:(?:매우\s*)?심한\s*)+/, "")
    .trim();

  // 괄호 안의 해설이나 환자 조건을 별도 효능으로 노출하지 않는다.
  if (
    isNonEffectKeyword(keyword) ||
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
