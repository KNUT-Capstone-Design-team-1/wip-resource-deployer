import { TResource } from "./types/resources";

/**
 * 원본 행의 속성명을 매핑하고 사용할 수 없는 값과 속성을 제외한다.
 */
function mapRow(value: unknown, propertyMap: Record<string, string>) {
  const isText = typeof value === "string";

  if (isText) {
    return Object.fromEntries(
      Object.values(propertyMap).map((key) => [key, value]),
    );
  }

  const isObject = typeof value === "object" && value !== null;

  if (!isObject) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, contents]) => [propertyMap[key.replace(/\s/g, "")], contents])
      .filter(([target]) => Boolean(target)),
  );
}

/**
 * 속성명 매핑에서 공백을 제거하고 원본 행을 리소스 배열로 변환한다.
 */
export function mappingProperty(
  rows: unknown[],
  propertyMap: Record<string, string>,
) {
  const normalizedMap = Object.fromEntries(
    Object.entries(propertyMap).map(([from, to]) => [
      from.replace(/\s/g, ""),
      to,
    ]),
  );

  return rows
    .map((row) => mapRow(row, normalizedMap))
    .filter((row) => Object.keys(row).length > 0) as unknown as TResource[];
}
