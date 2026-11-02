import { runQueryForSqlFile, runQueryWithOutput } from "./database/wrangler";
import { createSqlFile } from "./database/sql_file";
import { getSafeValue } from "./database/sql_values";
import logger from "../../utils/logger";
import { IUnifiedSearchData } from "./types/unified_search";
import type { SearchPill } from "./types/unified_search";

export const TARGET_DB = "wip_unified_search";

/**
 * 검색 데이터 UPSERT
 */
export async function upsert(unifiedSearchDataList: IUnifiedSearchData[]) {
  const isEmptyBatch = unifiedSearchDataList.length === 0;

  if (isEmptyBatch) {
    return;
  }

  const columnNames = ["ITEM_SEQ", "CONTENTS"];
  const setClauses = `CONTENTS = excluded.CONTENTS`;
  const valuesClauses = unifiedSearchDataList.map(
    (data) =>
      `(${getSafeValue(data.ITEM_SEQ)}, ${getSafeValue(data.CONTENTS)})`,
  );
  let insertQuery = `
  INSERT INTO unified_search (
    ${columnNames.join(",\n    ")}
  ) VALUES 
    ${valuesClauses.join(",\n    ")}
  ON CONFLICT(ITEM_SEQ) DO UPDATE SET
    ${setClauses};
  `;

  createSqlFile("unified_search.sql", insertQuery);
  runQueryForSqlFile("unified_search.sql", TARGET_DB);
}

const DELETE_BATCH_SIZE = 100;

/**
 * 조회 응답 객체 확인
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  const isObject = typeof value === "object";
  const isNotNull = value !== null;

  return isObject && isNotNull;
}

/**
 * 성공한 조회 결과의 행 추출
 */
function parseIdResult(result: unknown): unknown[] {
  const isResultObject = isRecord(result);

  if (!isResultObject) {
    throw new Error("Invalid search database ID response; deletion aborted");
  }

  const rows = result.results;
  const isSuccessful = result.success === true;
  const hasValidRows = Array.isArray(rows);
  const isInvalidResult = !isSuccessful || !hasValidRows;

  if (isInvalidResult) {
    throw new Error("Invalid search database ID response; deletion aborted");
  }

  return rows;
}

/**
 * 조회 행에서 품목 ID 추출
 */
function parseItemId(row: unknown): string {
  const isRowObject = isRecord(row);

  if (!isRowObject) {
    throw new Error("Invalid search database ITEM_SEQ; deletion aborted");
  }

  const itemSeq = row.ITEM_SEQ;
  const isValidItemSeq = typeof itemSeq === "string";

  if (!isValidItemSeq) {
    throw new Error("Invalid search database ITEM_SEQ; deletion aborted");
  }

  return itemSeq;
}

/**
 * DB 품목 ID 응답 검증·변환
 */
function parseExistingIds(output: string): string[] {
  const results: unknown = JSON.parse(output);
  const isMissingResults = !Array.isArray(results) || results.length === 0;

  if (isMissingResults) {
    throw new Error("Invalid search database ID response; deletion aborted");
  }

  const rows = results.flatMap(parseIdResult);

  return rows.map(parseItemId);
}

/**
 * 검색 DB의 현재 품목 ID 조회
 */
function loadExistingIds(): string[] {
  const shouldOutputJson = true;
  const output = runQueryWithOutput(
    "SELECT ITEM_SEQ FROM unified_search;",
    TARGET_DB,
    shouldOutputJson,
  );

  return parseExistingIds(output);
}

/**
 * 현재 알약 리소스에 없는 품목 선택
 */
function findRemovedIds(pillDataList: SearchPill[]): string[] {
  const currentIds = new Set(pillDataList.map((pill) => pill.ITEM_SEQ));
  const existingIds = loadExistingIds();

  return existingIds.filter((id) => {
    const isRemoved = !currentIds.has(id);

    return isRemoved;
  });
}

/**
 * 삭제 대상 한 묶음 실행
 */
function deleteItemBatch(ids: string[]): void {
  const idList = ids.map((id) => getSafeValue(id)).join(",");
  const query = `DELETE FROM unified_search WHERE ITEM_SEQ IN (${idList});`;

  createSqlFile("unified_search_delete.sql", query);
  runQueryForSqlFile("unified_search_delete.sql", TARGET_DB);
}

/**
 * 삭제 대상을 작은 묶음으로 순차 처리
 */
function deleteItemBatches(removedIds: string[]): void {
  for (let start = 0; start < removedIds.length; start += DELETE_BATCH_SIZE) {
    const end = start + DELETE_BATCH_SIZE;
    const ids = removedIds.slice(start, end);

    deleteItemBatch(ids);

    logger.info(
      "[UNIFIED-SEARCH] Removed obsolete items completed=%s/%s",
      Math.min(end, removedIds.length),
      removedIds.length,
    );
  }
}

/**
 * 삭제 품목 검색 데이터 제거
 */
export async function deleteRemovedItems(pillDataList: SearchPill[]) {
  const isEmptyPillList = !pillDataList?.length;

  if (isEmptyPillList) {
    return;
  }

  const removedIds = findRemovedIds(pillDataList);

  deleteItemBatches(removedIds);

  logger.info(
    "[UNIFIED-SEARCH] Successfully deleted removed items count=%s",
    removedIds.length,
  );
}
