import { createSqlFile } from "../unified_search/database/sql_file";
import {
  runQuery,
  runQueryForSqlFile,
} from "../unified_search/database/wrangler";
import { TARGET_DB } from "../unified_search/repository";
import {
  ALL_COLUMNS,
  FTS_SCHEMA,
  FTS_TABLES,
} from "../unified_search/search_data";
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

/** 기존 v2 원본 테이블로 두 FTS 검색 색인을 재구축하고 검증한다. */
async function rebuildFts5() {
  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Start FTS5 index rebuild");

  // 단일 SQL 문으로 재구축하므로 실패해도 기존 테이블과 트리거는 유지
  for (const table of FTS_TABLES) {
    runQuery(`INSERT INTO ${table}(${table}) VALUES ('rebuild');`, TARGET_DB);
    runQuery(
      `INSERT INTO ${table}(${table}, rank) VALUES ('integrity-check', 1);`,
      TARGET_DB,
    );
  }

  logger.info("[UNIFIED-SEARCH-FTS-REBUILD] Complete FTS5 index rebuild");
}
