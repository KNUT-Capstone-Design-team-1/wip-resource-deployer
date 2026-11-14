import { createSqlFile } from "../unified_search/database/sql_file";
import {
  runQuery,
  runQueryForSqlFile,
} from "../unified_search/database/wrangler";
import { TARGET_DB } from "../unified_search/repository";
import { ALL_COLUMNS, FTS_SCHEMA } from "../unified_search/search_data";
import { rebuildFts5 } from "../unified_search/rebuild";
import logger from "../../utils/logger";

/** Restore both FTS indexes and triggers from the existing source table. */
export async function restoreUnifiedSearchFts() {
  logger.info("[UNIFIED-SEARCH-FTS-RESTORE] Start db=%s", TARGET_DB);
  runQuery(
    `SELECT rowid, ${ALL_COLUMNS.join(", ")} FROM unified_search_v2 LIMIT 0;`,
    TARGET_DB,
  );
  createSqlFile("unified_search_fts_schema.sql", FTS_SCHEMA);
  runQueryForSqlFile("unified_search_fts_schema.sql", TARGET_DB);
  await rebuildFts5();
  logger.info("[UNIFIED-SEARCH-FTS-RESTORE] Complete");
}
