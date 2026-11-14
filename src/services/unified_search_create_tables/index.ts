import logger from "../../utils/logger";
import { SEARCH_SCHEMA } from "../unified_search/search_data";
import { TARGET_DB } from "../unified_search/repository";
import { createSqlFile } from "../unified_search/database/sql_file";
import { runQueryForSqlFile } from "../unified_search/database/wrangler";

/** Prepare missing search tables and triggers before writing data. */
export async function createTables() {
  logger.info("[UNIFIED-SEARCH-TABLES] Preparing tables and triggers");
  createSqlFile("unified_search_schema.sql", SEARCH_SCHEMA);
  runQueryForSqlFile("unified_search_schema.sql", TARGET_DB);
}
