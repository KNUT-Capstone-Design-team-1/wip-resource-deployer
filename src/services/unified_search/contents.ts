/**
 * XML / HTML 섞인 문자열을 순수 텍스트로 정제
 * @param input 대상 텍스트
 * @returns
 */
export function normalizeText(input: string) {
  const isEmptyInput = !input;

  if (isEmptyInput) {
    return "";
  }

  // XML 문서의 ARTICLE/SECTION title에 담긴 내용도 검색 텍스트에 포함한다.
  let text = input.replace(/<(?:article|section)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
    const title = /\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    return title ? ` ${title[1] ?? title[2]} ` : " ";
  });

  // HTML 엔티티 직접 처리 (DOMParser 없는 환경 대비)
  text = text .replace(/&nbsp;/gi, " ") .replace(/&lt;/gi, "<") .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // CDATA 제거
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  // XML / HTML 태그 제거
  text = text.replace(/<[^>]+>/g, " ");

  // 특수문자 제거 (한글 / 영문 / 숫자 / 공백만 유지)
  text = text.replace(/[^ㄱ-ㅎ가-힣a-zA-Z0-9\s]/g, " ");

  // 공백 정리
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * 중복 단어를 제거한 통합 검색 내용 문자열 생성
 * @param rawDataArr 원본 데이터 배열
 * @returns 중복 단어가 제거된 단일 문자열
 */
export function generateUniqueContents(rawDataArr: (string | undefined | null)[]) {
  const rawString = rawDataArr.filter((v) => v).join(" ");
  const words = rawString.split(/\s+/).filter((word) => word.length > 0);
  const uniqueWords = Array.from(new Set(words));

  return uniqueWords.join(" ");
}
