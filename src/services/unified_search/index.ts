import logger from "../../utils/logger";
import { readPillDataResource } from "./pill_resource";
import { createTables } from "../unified_search_create_tables";
import { upsertAll } from "./batches";
import { deleteRemovedItems } from "./repository";
import { rebuildFts5 } from "./rebuild";

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

  // 의약품과 문서 내용을 검색 레코드로 만들어 배치 저장
  await upsertAll(pills);

  // 현재 리소스에 없는 의약품을 검색 DB에서 제거
  await deleteRemovedItems(pills);

  // 저장과 삭제를 마친 검색 데이터 전체를 FTS 인덱스에 반영
  await rebuildFts5();

  logger.info("[UNIFIED-SEARCH] Complete update search data");
}
