import logger from "../../utils/logger";
import { readPillDataResource } from "./pill_resource";
import { upsertAll } from "./batches";
import { verifyUnifiedSearch } from "./verify";

/**
 * 알약 리소스 기반 검색 갱신
 */
export async function updateUnifiedSearchDb() {
  logger.info("[UNIFIED-SEARCH] Start reading pill_data.json");

  const pills = await readPillDataResource();

  // 의약품과 문서 내용을 UPSERT하며 FTS는 DB 트리거가 자동 동기화
  await upsertAll(pills);
  await verifyUnifiedSearch();

  logger.info("[UNIFIED-SEARCH] Complete update search data");
}
