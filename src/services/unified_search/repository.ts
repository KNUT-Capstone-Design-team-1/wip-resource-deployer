import { runQueryForSqlFile } from "./database/wrangler";
import { createSqlFile } from "./database/sql_file";
import { IUnifiedSearchData } from "./types/unified_search";
import { buildUpsertSql } from "./search_data";

export const TARGET_DB = "wip_unified_search";

export async function upsert(records: IUnifiedSearchData[]) {
  const sql = buildUpsertSql(records);
  if (!sql) return;
  createSqlFile("unified_search.sql", sql);
  runQueryForSqlFile("unified_search.sql", TARGET_DB);
}
