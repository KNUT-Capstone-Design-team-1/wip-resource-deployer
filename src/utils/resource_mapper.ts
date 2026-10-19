import { TResource } from "./types/resources";

type ResourceRow = Record<string, unknown>;
type ValueNormalizer = (value: unknown) => unknown;
type HeaderResolver = (header: string) => string | undefined;

/**
 * 헤더 정규화 및 매핑 결과 캐시
 */
function createHeaderResolver(
  propertyMap: Record<string, string>,
): HeaderResolver {
  const normalizedMap = new Map(
    Object.entries(propertyMap).map(([from, to]) => [
      from.replace(/\s/g, ""),
      to,
    ]),
  );
  const headers = new Map<string, string | undefined>();

  return (header) => {
    const isCached = headers.has(header);

    if (isCached) {
      return headers.get(header);
    }

    const target = normalizedMap.get(header.replace(/\s/g, ""));

    headers.set(header, target);

    return target;
  };
}

/**
 * 문자열 행 정규화 및 대상 속성 매핑
 */
function mapTextRow(
  value: string,
  targets: string[],
  normalize: ValueNormalizer,
): ResourceRow {
  const row: ResourceRow = {};
  const contents = normalize(value);

  for (const target of targets) {
    row[target] = contents;
  }

  return row;
}

/**
 * 객체 행의 등록된 속성 매핑 및 값 정규화
 */
function mapObjectRow(
  value: object,
  resolveHeader: HeaderResolver,
  normalize: ValueNormalizer,
): ResourceRow {
  const row: ResourceRow = {};

  for (const [header, contents] of Object.entries(value)) {
    const target = resolveHeader(header);
    const isUnknownHeader = target === undefined;

    if (isUnknownHeader) {
      continue;
    }

    row[target] = normalize(contents);
  }

  return row;
}

/**
 * 원본 타입별 행 매핑
 */
function mapRow(
  value: unknown,
  targets: string[],
  resolveHeader: HeaderResolver,
  normalize: ValueNormalizer,
): ResourceRow {
  const isText = typeof value === "string";

  if (isText) {
    return mapTextRow(value, targets, normalize);
  }

  const isInvalidRow = typeof value !== "object" || value === null;

  if (isInvalidRow) {
    return {};
  }

  return mapObjectRow(value, resolveHeader, normalize);
}

/**
 * 빈 문자열·null·undefined 제외 여부 확인
 */
function hasContents(value: unknown): boolean {
  return value !== "" && value !== null && value !== undefined;
}

/**
 * 빈 행 제외 정책에 따른 포함 여부 판단
 */
function shouldIncludeRow(row: ResourceRow, excludeEmpty: boolean): boolean {
  const isEmptyRow = Object.keys(row).length === 0;

  if (isEmptyRow) {
    return false;
  }

  return !excludeEmpty || Object.values(row).some(hasContents);
}

/**
 * 리소스 속성 매핑 및 빈 행 필터링
 */
export function mappingProperty(
  rows: unknown[],
  propertyMap: Record<string, string>,
  normalizeValue?: (value: unknown) => string,
) {
  const resolveHeader = createHeaderResolver(propertyMap);
  const targets = Object.values(propertyMap);
  const normalize: ValueNormalizer = normalizeValue ?? ((value) => value);
  const excludeEmpty = normalizeValue !== undefined;
  const results: ResourceRow[] = [];

  for (const value of rows) {
    const row = mapRow(value, targets, resolveHeader, normalize);
    const includeRow = shouldIncludeRow(row, excludeEmpty);

    if (includeRow) {
      results.push(row);
    }
  }

  return results as unknown as TResource[];
}
