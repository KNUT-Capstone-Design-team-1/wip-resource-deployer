import logger from "./logger";
export { logger };

export * from "./resource_loader";
export * from "./resource";
export * from "./wrangler";

/**
 * 객체 배열 내 객체 간 ID 값을 기준으로 중복되는 항목을 병합
 * @param idColumn ID 컬럼명
 * @param objectArray 병합 대상 객체 배열
 * @returns
 */
export function mergeDuplicateObjectArray(
  idColumn: string,
  objectArray: Array<Record<string, any>>,
) {
  const mergedMap = new Map();

  objectArray.forEach((object) => {
    const existing = mergedMap.get(object[idColumn]);

    if (!existing) {
      mergedMap.set(object[idColumn], { ...object });
      return;
    }

    for (const key in object) {
      if (key === idColumn) {
        continue;
      }

      const existValue = existing[key] ? existing[key].split(",") : [];
      const newValue = object[key] ? object[key].split(",") : [];

      existing[key] = Array.from(new Set([...existValue, ...newValue])).join(
        ",",
      );
    }

    mergedMap.set(object[idColumn], { ...existing });
  });

  return Array.from(mergedMap.values());
}

/**
 * XML / HTML 섞인 문자열을 순수 텍스트로 정제
 * @param input 대상 텍스트
 * @returns
 */
export function normalizeText(input: string): string {
  if (!input) {
    return "";
  }

  let text = input;

  // HTML 엔티티 직접 처리 (DOMParser 없는 환경 대비)
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // CDATA 제거
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

  // XML / HTML 태그 제거
  text = text.replace(/<[^>]+>/g, "");

  // 특수문자 제거 (한글 / 영문 / 숫자 / 공백만 유지)
  text = text.replace(/[^ㄱ-ㅎ가-힣a-zA-Z0-9\s]/g, " ");

  // 공백 정리
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
