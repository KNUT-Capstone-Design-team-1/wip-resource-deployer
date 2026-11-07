/** 속성 접근이 가능한 객체인지 확인한다. 배열도 기존 파서와 동일하게 허용한다. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
