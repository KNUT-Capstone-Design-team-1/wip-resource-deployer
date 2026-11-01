import fs from "node:fs/promises";
import path from "node:path";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { PILL_DATA_COLUMNS } from "./columns";
import type { SearchPill } from "./types/unified_search";

/**
 * 객체 여부 확인
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 품목 ID 형식 확인
 */
function hasValidIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

/**
 * 검색 필드 검증
 */
function isSearchPill(value: unknown): value is SearchPill {
  const isObject = isRecord(value);
  if (!isObject) {
    return false;
  }

  const hasIdentifier = hasValidIdentifier(value.ITEM_SEQ);
  if (!hasIdentifier) {
    return false;
  }

  return PILL_DATA_COLUMNS.every((column) => typeof value[column] === "string");
}

/**
 * 리소스 배열 추출
 */
function readResources(value: unknown): unknown[] {
  const isObject = isRecord(value);
  if (!isObject) {
    throw new Error("Invalid pill_data.json resource structure");
  }

  const resources = value.resources;

  const hasResources = Array.isArray(resources);
  if (!hasResources) {
    throw new Error("Invalid pill_data.json resources array");
  }

  return resources;
}

/**
 * 검색 품목·ID 중복 검증
 */
function validatePill(value: unknown, identifiers: Set<string>): SearchPill {
  const isValidPill = isSearchPill(value);
  if (!isValidPill) {
    throw new Error("Invalid pill_data.json item or search fields");
  }

  const isDuplicate = identifiers.has(value.ITEM_SEQ);
  if (isDuplicate) {
    throw new Error("Duplicate ITEM_SEQ in pill_data.json: " + value.ITEM_SEQ);
  }

  identifiers.add(value.ITEM_SEQ);

  return value;
}

/**
 * 알약 리소스 로드·검증
 */
export async function readPillDataResource(
  filePath = path.join(RESOURCE_DIRECTORY, "pill_data.json"),
): Promise<SearchPill[]> {
  const contents = await fs.readFile(filePath, "utf8");
  const resources = readResources(JSON.parse(contents));

  const isEmptyResource = resources.length === 0;
  if (isEmptyResource) {
    throw new Error("pill_data.json contains no items; search update stopped");
  }

  const identifiers = new Set<string>();

  return resources.map((value) => validatePill(value, identifiers));
}
