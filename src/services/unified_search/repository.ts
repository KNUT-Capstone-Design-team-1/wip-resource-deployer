import { runQueryForSQLFile } from "./database/wrangler";
import { createSQLFile } from "./database/sql_file";
import { getSafeValue } from "./database/sql_values";
import logger from "../../utils/logger";
import { IUnifiedSearchData } from "./types/unified_search";
import { IPillData } from "../pill_data/types/pill_data";

export const TARGET_DB = "wip_unified_search";

/**
 * 검색 레코드의 INSERT 및 충돌 시 갱신 SQL을 생성해 D1에 실행한다.
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

  createSQLFile("unified_search.sql", insertQuery);
  runQueryForSQLFile("unified_search.sql", TARGET_DB);
}

/**
 * 현재 의약품 목록에 없는 항목을 통합 검색 DB에서 삭제한다.
 */
export async function deleteRemovedItems(pillDataList: IPillData[]) {
  const isEmptyPillList = !pillDataList?.length;

  if (isEmptyPillList) {
    return;
  }

  const idList = pillDataList.map((p) => getSafeValue(p.ITEM_SEQ)).join(",");
  const query = `DELETE FROM unified_search WHERE ITEM_SEQ NOT IN (${idList});`;

  createSQLFile("unified_search_delete.sql", query);
  runQueryForSQLFile("unified_search_delete.sql", TARGET_DB);
  logger.info("[UNIFIED-SEARCH] Successfully deleted removed items");
}
