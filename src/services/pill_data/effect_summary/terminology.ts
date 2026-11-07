/** 한글 명칭 뒤에 반복되는 영문 해설만 제거한다. 검사 수치와 표적·병기는 보존한다. */
export function simplifyEffectTerminology(text: string): string {
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(
      /([가-힣])\s*(?:\(([^()]*)\)|（([^（）]*)）|\[([^\[\]]*)\])/g,
      (match, word: string, round: string, wide: string, square: string) => {
        const alias = (round ?? wide ?? square).trim();
        if (
          !/[a-z]/i.test(alias) ||
          /[가-힣]/.test(alias) ||
          /[<>=≤≥%]|\b(?:mg|kg|ml|cm|mmHg|copies|cells)\b/i.test(alias) ||
          /\b(?:NYHA|class|stage|HER-?2|EGFR|ALK|ROS1|BRAF|BRCA|Ph|PD-L1|CD\d+|HIV-?1)\b/i.test(
            alias,
          )
        )
          return match;
        // 숫자로 된 병기나 유형은 별칭과 구분한다.
        if (
          /\d/.test(alias) &&
          !/^(?:B\s*\d+|COX-2|DPP-4|HMG-CoA)$/i.test(alias)
        )
          return match;
        return word;
      },
    );
  }
  return text
    .replace(/\bSGPT\b(?:\s*\(\s*ALT\s*\))?/gi, "간 수치")
    .replace(/\bGERD\b/gi, "위식도 역류질환")
    .replace(/\bBMI\b/g, "체질량지수")
    .replace(/\bNSAIDs?\b/g, "비스테로이드 소염진통제")
    .replace(/\bADHD\b/g, "주의력결핍 과잉행동장애")
    .replace(/\bCABG\b/g, "관상동맥 우회술")
    .replace(/\bPCI\b/g, "관상동맥 중재술")
    .replace(/\bPTCA\b/g, "관상동맥 성형술")
    .replace(/\bnon-HDL(?:-C)?(?:-콜레스테롤)?/g, "비고밀도 콜레스테롤")
    .replace(/\bLDL(?:-C)?(?:-콜레스테롤)?/g, "저밀도 콜레스테롤")
    .replace(/\bHDL(?:-C)?(?:-콜레스테롤)?/g, "고밀도 콜레스테롤")
    .replace(/\bTG\b/g, "중성지방");
}
