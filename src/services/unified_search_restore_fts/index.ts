import {
  createUnifiedSearchFtsTable,
  createUnifiedSearchFtsInsertTrigger,
  createUnifiedSearchFtsUpdateTrigger,
  createUnifiedSearchFtsDeleteTrigger,
} from "../unified_search_create_tables/schema";
import { runQuery } from "../unified_search/database/wrangler";
import { TARGET_DB } from "../unified_search/repository";
import { rebuildFts5 } from "../unified_search/rebuild";
import logger from "../../utils/logger";

/** 원본 테이블은 유지하고 FTS 테이블·인덱스·동기화 트리거만 복구한다. */
export async function restoreUnifiedSearchFts() {
  logger.info(
    "[UNIFIED-SEARCH-FTS-RESTORE] Start remote FTS restore db=%s",
    TARGET_DB,
  );

  // 원본 테이블이 없거나 필요한 열이 없으면 복구 작업 전에 중단
  runQuery("SELECT rowid, CONTENTS FROM unified_search LIMIT 0;", TARGET_DB);

  // 원본 테이블 생성 없이 누락된 FTS 객체만 준비
  createUnifiedSearchFtsTable();
  createUnifiedSearchFtsInsertTrigger();
  createUnifiedSearchFtsUpdateTrigger();
  createUnifiedSearchFtsDeleteTrigger();
  await rebuildFts5();

  runQuery(
    "INSERT INTO unified_search_fts(unified_search_fts, rank) VALUES ('integrity-check', 1);",
    TARGET_DB,
  );

  logger.info(
    "[UNIFIED-SEARCH-FTS-RESTORE] Complete FTS restore and integrity check",
  );
}
