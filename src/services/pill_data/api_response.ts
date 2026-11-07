import { isRecord } from "../../utils/guards";
import { tryItem } from "../../utils/item_processing";

export interface ApiItem {
  ITEM_SEQ: string | number;
}

export interface ApiPage<T> {
  items: T[];
  totalCount: number;
  receivedCount: number;
}

/**
 * 객체 구조 검증
 */
function requireRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  const isObject = isRecord(value);
  if (!isObject) {
    throw new Error(message);
  }

  return value;
}

/**
 * 전체 건수 검증·변환
 */
function readTotalCount(value: unknown): number {
  const hasNumericType = typeof value === "number" || typeof value === "string";
  const isBlank = String(value).trim() === "";

  const isInvalidInput = !hasNumericType || isBlank;
  if (isInvalidInput) {
    throw new Error("API returned invalid totalCount");
  }

  const count = Number(value);

  const isInvalidCount = !Number.isSafeInteger(count) || count < 0;
  if (isInvalidCount) {
    throw new Error("API returned invalid totalCount");
  }

  return count;
}

/**
 * 목록 형식 통일
 */
function asArray(value: unknown): unknown[] {
  const isEmpty = value == null || value === "";
  if (isEmpty) {
    return [];
  }

  const isArray = Array.isArray(value);
  if (isArray) {
    return value;
  }

  return [value];
}

/**
 * 응답 항목 추출
 */
function readItems(value: unknown): unknown[] {
  const isDirectArray = Array.isArray(value);
  if (isDirectArray) {
    return value;
  }

  const isEmpty = value == null || value === "";
  if (isEmpty) {
    return [];
  }

  const wrapper = requireRecord(value, "API returned invalid items");

  const hasItem = "item" in wrapper;
  if (!hasItem) {
    throw new Error("API returned invalid items");
  }

  return asArray(wrapper.item);
}

/**
 * 품목 ID 형식 확인
 */
function isIdentifier(value: unknown): boolean {
  const isNumber = typeof value === "number";
  if (isNumber) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  const isString = typeof value === "string";

  return isString && /^\d+$/.test(value);
}

/**
 * 응답 품목 검증
 */
function validateItem(value: unknown): void {
  const item = requireRecord(value, "API returned invalid item");

  const hasIdentifier = isIdentifier(item.ITEM_SEQ);
  if (!hasIdentifier) {
    throw new Error("API returned an item without ITEM_SEQ");
  }
}

/**
 * API 페이지 검증·변환
 */
export function parseApiPage<T extends ApiItem>(
  value: unknown,
  pageNo: number,
): ApiPage<T> {
  const response = requireRecord(value, "API returned invalid response");
  const header = requireRecord(response.header, "API returned invalid header");

  const isSuccess = String(header.resultCode) === "00";
  if (!isSuccess) {
    throw new Error("API returned an unsuccessful response");
  }

  const body = requireRecord(response.body, "API returned missing body");

  const isExpectedPage = Number(body.pageNo) === pageNo;
  if (!isExpectedPage) {
    throw new Error("API returned invalid pageNo");
  }

  const totalCount = readTotalCount(body.totalCount);
  const items = readItems(body.items);
  const validItems = items.flatMap((item, index) => {
    const validItem = tryItem(
      () => {
        validateItem(item);

        return item as T;
      },
      "API page=" + pageNo + " item=" + (index + 1),
    );

    return validItem === undefined ? [] : [validItem];
  });

  return { items: validItems, totalCount, receivedCount: items.length };
}

/**
 * 페이지 수집 건수 검증
 */
export function validatePageProgress<T>(
  page: ApiPage<T>,
  collected: number,
  expectedTotal: number,
): void {
  const isTotalChanged = page.totalCount !== expectedTotal;
  if (isTotalChanged) {
    throw new Error(
      "API totalCount changed during collection; retry the export",
    );
  }

  const hasMissingItems = page.receivedCount === 0 && collected < expectedTotal;
  if (hasMissingItems) {
    throw new Error("API returned an empty page before all items were fetched");
  }

  const hasExcessItems = collected + page.receivedCount > expectedTotal;
  if (hasExcessItems) {
    throw new Error("API returned more items than totalCount");
  }
}
