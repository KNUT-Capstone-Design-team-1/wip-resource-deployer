import { simplifyEffectTerminology } from "./terminology";

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

/**
 * 효능 키워드 정리
 */
function normalizeKeyword(value: string): string {
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
    .replace(
      /^.*(?:조절되지\s*않는|반응하지\s*않는|반응이\s*적절하지\s*않은|상승되어\s*있는|필요한|요구되는|적합한)\s*/,
      "",
    )
    .replace(/^(?:지속적으로|적절하게|상승된|낮은|동반한|같이)\s+/, "")
    .replace(/^(?:성인|소아|청소년)\s+(?=주의력결핍)/, "")
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

/** 쉼표로 나누기 전에 공유 명사와 비타민 이름을 복원한다. */
function prepareKeywordExpression(expression: string): string {
  return simplifyEffectTerminology(expression)
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

/** 실제 리소스에 함께 등장하는 동의어·표기 변형을 대표 명칭으로 맞춘다. */
function normalizeKeywordSynonym(keyword: string): string {
  const synonyms: Record<string, string> = {
    주의력결핍과잉행동장애: "주의력결핍 과잉행동장애",
    본태고혈압: "본태성 고혈압",
    알레르기비염: "알레르기 비염",
    알레르기성비염: "알레르기 비염",
    소양증: "가려움증",
    피부소양증: "가려움증",
    피부가려움: "가려움증",
    가려움: "가려움증",
    동통: "통증",
    코염: "비염",
    구각염: "입꼬리염",
    구순염: "입술염",
    구내염: "입안염",
    설염: "혀염",
    류마티양관절염: "류마티스 관절염",
    류마티스관절염: "류마티스 관절염",
    위식도역류질환: "위식도 역류질환",
    아포B단백: "아포 B 단백",
    트리글리세라이드: "중성지방",
    트리글리세리드: "중성지방",
    총콜레스테롤: "총 콜레스테롤",
  };
  return synonyms[keyword.replace(/[\s-]/g, "")] ?? keyword;
}

/** 대상·치료 방식·문장 조각과 병용 성분을 독립 효능으로 노출하지 않는다. */
function isNonEffectKeyword(keyword: string): boolean {
  if (/^(?:비타민 [A-K]\d*|[BC]형\s*간염|HIV(?:-1)?\s*감염)/i.test(keyword))
    return false;
  if (
    /^(?:급|차|이|약|만|병|제|진행|일부로서|대상|장애|선택성|비선택성|효력|유지하기|과|및|서|여러|운동|재발|단기|중등도|중등도-중증|다중위험요소|두 약물|포화지방|가족력|다음|성인|소아|청소년|여성|남성|전문가|국소적|진전된|인공적|지속적|원인|위험성?|제증상|증후|목적|재발방지|혈당|향상시키기|이형접합 가족형|비가족형|체질량지수|식이|단독|병용|식사요법|운동요법|식이요법|보조요법|부가요법제?|단일요법|복합요법|초기요법|치료요법|증상치료요법|유지요법|장기간 유지요법|항생제 병용)$/i.test(
      keyword,
    )
  )
    return true;
  if (
    /^(?:stage|NYHA|type|class)\b/i.test(keyword) ||
    /^(?:[A-Z][A-Z0-9-]*\s*)?(?:양성|음성)$/.test(keyword)
  )
    return true;
  if (
    /^(?:[A-K]\s*\d*|[Ⅰ-ⅩIVX]+[ab]?형?|total-C|LDL-C|HDL-C|Apo B|TG|ALT|AST|mg|kg|mL|Fredrickson)$/i.test(
      keyword,
    )
  )
    return true;
  if (/^\d+\s*차$/.test(keyword) || /^(?:성인|소아|청소년)\s*$/.test(keyword))
    return true;
  if (
    /^(?:(?:만\s*)?\d+\s*(?:세|kg|㎏)|체중이)/.test(keyword) &&
    !/(?:병|염|암|통|증|장애|질환|궤양|발작|고혈압)$/.test(keyword)
  )
    return true;
  // 분류명만 있는 원본도 유효하다. '당뇨병용제'의 '병용'은 병용요법이 아니다.
  if (/^[가-힣]+(?:요법제|용제|억제제)$/.test(keyword)) return false;
  if (
    /(?:요법|병용|단독|복합제|항생제|투여|수용체|임상적|불내성|반응|양성이거나|알려지지 않은|수치를|수치가|중에|동안|필요|요구|실시|중요|못했|같다|없으나|된 비타민|팔미틴산|콜레칼시페롤|사용상|치료\s*프로그램|사용했|임상시험|입증|진단|검사법)/.test(
      keyword,
    ) &&
    !/(?:병|염|암|통|증|장애|질환|궤양|발작|고혈압|탈모|두드러기|빈혈)$/.test(
      keyword,
    )
  )
    return true;
  if (
    /^(?:메트포르민|메토트렉세이트|인슐린|암로디핀|에스암로디핀|발사르탄|텔미사르탄|로사르탄|올메사르탄메독소밀|피마사르탄칼륨|시타글립틴|설포닐우레아(?:제)?|아스피린|에제티미브|실로스타졸|카르베딜롤|로수바스타틴|덱사메타손|나프록센|보르테조밉|아토르바스타틴(?:칼슘)?)$/.test(
      keyword,
    )
  )
    return true;
  return (
    /(?:은|는|거나|하여|하도록|시키기|시키고|시킨|한|된|적인|적|하며|하고|되며)$/.test(
      keyword,
    ) ||
    /^(?:앓는|받은|보지|이러한|효과는|기존|충분한|경우|다른|치료에|대하여|또는|및)(?:\s|에는)/.test(
      keyword,
    ) ||
    /^[a-z][a-z\s-]*$/i.test(keyword)
  );
}
