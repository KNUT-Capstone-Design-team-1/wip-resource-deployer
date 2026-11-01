/**
 * HTML 엔티티 치환표
 */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  Delta: "Δ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
};

/**
 * 이름형 엔티티 복원
 */
function decodeNamedEntity(entity: string, code: string): string {
  const isKnownEntity = Object.prototype.hasOwnProperty.call(ENTITIES, code);

  if (isKnownEntity) {
    return ENTITIES[code];
  }

  return entity;
}

/**
 * 문자 코드 변환
 */
function parseCodePoint(code: string): number {
  const isHexadecimal = code[1].toLowerCase() === "x";

  if (isHexadecimal) {
    return parseInt(code.slice(2), 16);
  }

  return Number(code.slice(1));
}

/**
 * 숫자형 엔티티 복원
 */
function decodeNumericEntity(entity: string, code: string): string {
  const point = parseCodePoint(code);
  const isSurrogate = point >= 0xd800 && point <= 0xdfff;

  const isInvalidPoint = point <= 0 || point > 0x10ffff || isSurrogate;

  if (isInvalidPoint) {
    return entity;
  }

  return String.fromCodePoint(point);
}

/**
 * 유형별 엔티티 복원
 */
function decodeEntity(entity: string, code: string): string {
  const isNumericEntity = code.startsWith("#");

  if (isNumericEntity) {
    return decodeNumericEntity(entity, code);
  }

  return decodeNamedEntity(entity, code);
}

/**
 * 리소스 텍스트 정리
 */
export function normalizeResourceText(value: unknown): string {
  return String(value ?? "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replace(
      /[\u0000-\u0008\u000e-\u001f\u007f-\u009f\u00ad\u200b-\u200d\u2060\ufeff]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 화학 데이터 정규화
 */
export function normalizeChemicalValue(value: unknown): string {
  const text = normalizeResourceText(value);

  const isPlaceholder = /^[-–—]+$/.test(text);

  if (isPlaceholder) {
    return "";
  }

  return text;
}
