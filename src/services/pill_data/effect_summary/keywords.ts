import { simplifyEffectTerminology } from "./terminology";
import { normalizeKeyword } from "./keyword_normalization";
import { normalizeKeywordSynonym } from "./keyword_rules";

/**
 * 효능 키워드 추출
 */
export function extractEffectKeywords(expression: string): string[] {
  expression = expression.replace(/\[[^\]]*(?:참조|참고)[^\]]*\]/g, "");
  if (
    /임상시험|진단(?:은|시|을|해야|검사)|검사법|고려할\s*점|치료효과는|가이드라인|효력을\s*유지하기|교육|의사의\s*평가|처방\s*여부|대체치료|학습장애는|약물\s*치료는|모든\s*병력/.test(
      expression,
    )
  ) {
    return [];
  }

  // 예시 위험인자 목록은 이 약이 치료하는 질환 목록과 구분한다.
  expression = expression.replace(/\([^()]*(?:위험인자|위험요소)[^()]*\)/g, "");
  expression = expression.replace(
    /((?:위험\s*인자|다중위험요소))\s*\([^()]*\)/g,
    "$1",
  );

  const text = prepareKeywordExpression(expression)
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
    .replace(/(?:성인|소아|청소년)?\s*환자(?:에서의|에서|에게|의|에)?/g, ",")
    .replace(/(?:의|을|를)\s+/g, ",")
    .replace(/으로\s+/g, ",")
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

/** 쉼표로 나누기 전에 공유 명사와 비타민 이름을 복원한다. */
function prepareKeywordExpression(expression: string): string {
  return simplifyEffectTerminology(expression)
    .replace(
      /(?:초기\s*)?체질량지수(?:가)?\s*\d+(?:\.\d+)?\s*kg\s*\/\s*m\s*(?:2|²)\s*(?:이상인|이상)?/gi,
      ",",
    )
    .replace(/말초와\s*중추\s*(신경병증성\s*통증)/g, "말초 $1,중추 $1")
    .replace(
      /미란성과?\s*(?:또는|및)\s*궤양성\s*(위식도\s*역류질환)/g,
      "미란성 $1,궤양성 $1",
    )
    .replace(/증상(?:이나|\s*및)\s*징후/g, "증상")
    .replace(
      /주의력\s*결핍\s*\/?\s*과잉행동\s*장애/g,
      "주의력결핍 과잉행동장애",
    )
    .replace(/유전자형\s*\d+(?:\s*,\s*\d+)*\s*형/g, ",")
    .replace(/(만성\s*[BC]형\s*간염)\s*바이러스에\s*감염된\s*(?:성인)?/g, "$1,")
    .replace(
      /([가-힣]+)\(([가-힣]+)\)/g,
      (match, name: string, alias: string) =>
        normalizeKeywordSynonym(name) === normalizeKeywordSynonym(alias)
          ? name
          : match,
    )
    .replace(/급\s*[·ㆍ]\s*만성\s*([가-힣]+)/g, "급성$1,만성$1")
    .replace(/위\s*[·ㆍ]\s*십이지장\s*궤양/g, "위궤양,십이지장궤양")
    .replace(
      /계절성\s*(?:및|또는)\s*다년성\s*(알레르기(?:성)?\s*비염)/g,
      "계절성 $1,다년성 $1",
    )
    .replace(/뼈\s*[·ㆍ]\s*이의\s*발육불량/g, "뼈 발육불량,치아 발육불량")
    .replace(/눈의\s*(건조감|피로)/g, "눈 $1")
    .replace(
      /비타민\s*([A-K](?:\s*\d+)?(?:\s*[,·ㆍ]\s*[A-K](?:\s*\d+)?)*)/gi,
      (_, list: string) =>
        list
          .split(/[,·ㆍ]/)
          .map((name) => "비타민 " + name.replace(/\s/g, ""))
          .join(","),
    )
    .replace(/\((?:병을\s*앓는[^)]*|원인\s*불명[^)]*|밤에\s*잘[^)]*)\)/g, "")
    .replace(
      /다음(?:의)?\s*(?:질환|질병|증상|경우)?(?:의|에)?\s*(?:완화|개선|치료)?\s*[:：]?/g,
      "",
    )
    .replace(/혈당조절을?\s*(?:향상|개선)시키기/g, "혈당조절")
    .replace(/\b(?:및|또는)\b/g, ",");
}
