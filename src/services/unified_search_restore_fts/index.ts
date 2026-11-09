import { createTables } from "../unified_search_create_tables";
import { runQuery } from "../unified_search/database/wrangler";
import { TARGET_DB } from "../unified_search/repository";
import { rebuildFts5 } from "../unified_search/rebuild";
import logger from "../../utils/logger";

/** 기존 데이터를 유지하면서 테이블 생성 작업과 동일한 FTS 구조를 복구한다. */
export async function restoreUnifiedSearchFts() {
  logger.info(
    "[UNIFIED-SEARCH-FTS-RESTORE] Start remote FTS restore db=%s",
    TARGET_DB,
  );

  // 원본 테이블이 없거나 필요한 열이 없으면 복구 작업 전에 중단
  runQuery(
    "SELECT rowid, ITEM_SEQ, CONTENTS FROM unified_search LIMIT 0;",
    TARGET_DB,
  );

  // 최초 생성과 동일한 함수로 테이블과 INSERT/UPDATE/DELETE 동기화 트리거 준비
  // 모든 CREATE는 IF NOT EXISTS이며 기존 데이터와 객체는 삭제하지 않음
  await createTables();
  await rebuildFts5();

  runQuery(
    "INSERT INTO unified_search_fts(unified_search_fts, rank) VALUES ('integrity-check', 1);",
    TARGET_DB,
  );

  logger.info(
    "[UNIFIED-SEARCH-FTS-RESTORE] Complete FTS restore and integrity check",
  );
}
