import { normalizeResourceText } from "../../utils/resource_text";

/**
 * 페이지 번호 제거
 */
function removePageNumbers(text: string): string {
  const header = /^(\d{1,3})\s+\1\s+\d{1,3}(?=\s|$)\s*/.exec(text);

  const hasPageHeader = header !== null;

  if (!hasPageHeader) {
    return text;
  }

  const pageNumber = header[1];
  const body = text.slice(header[0].length);
  const footerPattern = new RegExp("\\s+" + pageNumber + "$");

  return body.replace(footerPattern, "");
}

/**
 * 목차 점선·번호 제거
 */
function removeContentsLeaders(text: string): string {
  return text
    .replace(/(?:\.{3,}|…+|·{3,})\s*\d{1,3}(?=\s|$)/g, " ")
    .replace(/(?:\.{3,}|…+|·{3,})/g, " ");
}

/**
 * 제목 발행 연도 제거
 */
function removeTitleYears(text: string): string {
  return text.replace(
    /\b(?:19|20)\d{2}(?:년도?|년)?\s*(?=prohibited\s+list|monitoring\s+program|금지목록|모니터(?:링|�)\s*프로그램)/gi,
    "",
  );
}

/**
 * 도핑 금지 본문 정리
 */
export function normalizeProhibitedListText(value: unknown): string {
  const text = normalizeResourceText(value);
  const isCover =
    /^WORLD ANTI-DOPING CODE INTERNATIONAL STANDARD PROHIBITED LIST\b/i.test(
      text,
    );
  const isYearOnly = /^(?:19|20)\d{2}$/.test(text);

  const isDisposablePage = isCover || isYearOnly;

  if (isDisposablePage) {
    return "";
  }

  const body = removePageNumbers(text);
  const withoutLeaders = removeContentsLeaders(body);
  const withoutTitleYears = removeTitleYears(withoutLeaders);

  return normalizeResourceText(withoutTitleYears);
}
