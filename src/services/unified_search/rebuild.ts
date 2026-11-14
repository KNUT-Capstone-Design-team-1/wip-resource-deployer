import logger from "../../utils/logger";
import { runQuery } from "./database/wrangler";
import { TARGET_DB } from "./repository";
import { FTS_TABLES } from "./search_data";

/**
 * 기존 FTS5 테이블의 인덱스 재구축
 */
export async function rebuildFts5() {
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
