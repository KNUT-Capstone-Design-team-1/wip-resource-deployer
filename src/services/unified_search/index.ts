import logger from "../../utils/logger";
import { readPillDataResource } from "./pill_resource";
import { createTables } from "../unified_search_create_tables";
import { upsertAll } from "./batches";

/**
 * 알약 리소스 기반 검색 갱신
 */
export async function updateUnifiedSearchDb(dbInitialize = false) {
  logger.info("[UNIFIED-SEARCH] Start reading pill_data.json");

  const pills = await readPillDataResource();

  // 초기화가 설정된 경우 검색 테이블과 동기화 트리거를 준비
  const shouldInitializeDatabase = dbInitialize;

  if (shouldInitializeDatabase) {
    await createTables();
  }

  // 의약품과 문서 내용을 UPSERT하며 FTS는 DB 트리거가 자동 동기화
  await upsertAll(pills);

  logger.info("[UNIFIED-SEARCH] Complete update search data");
}
