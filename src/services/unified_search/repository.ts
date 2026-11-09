import { runQueryForSqlFile } from "./database/wrangler";
import { createSqlFile } from "./database/sql_file";
import { getSafeValue } from "./database/sql_values";
import { IUnifiedSearchData } from "./types/unified_search";

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
