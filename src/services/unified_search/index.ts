import logger from "../../utils/logger";
import { ResourceLoader } from "../../utils/resource_loader";
import { createPillData } from "../pill_data/transform";
import { createTables } from "../unified_search_create_tables";
import { upsertAll } from "./batches";
import { deleteRemovedItems } from "./repository";
import { rebuildFts5 } from "./rebuild";

/**
 * 의약품 원본으로 검색 데이터를 갱신하고 필요 시 테이블을 초기화
 */
export async function updateUnifiedSearchDb(dbInitialize = false) {
  // 검색에 필요한 낱알식별 정보와 의약품 허가 상세 원본을 읽기
  logger.info("[UNIFIED-SEARCH] Start load resource");

  const resources = await new ResourceLoader([
    "drug_recognition",
    "finished_medicine_permission_detail",
  ]).loadResource();

  // 두 원본을 결합해 검색 대상 의약품 목록을 생성
  const pills = createPillData(
    resources.drugRecognition,
    resources.finishedMedicinePermissionDetail,
  );

  // 초기화가 설정된 경우 검색 테이블과 동기화 트리거를 준비
  const shouldInitializeDatabase = dbInitialize;

  if (shouldInitializeDatabase) {
    await createTables();
  }

  // 의약품과 문서 내용을 검색 레코드로 만들어 배치 저장
  await upsertAll(pills);

  // 현재 원본에 없는 의약품을 검색 DB에서 제거
  await deleteRemovedItems(pills);

  // 저장과 삭제를 마친 검색 데이터 전체를 FTS 인덱스에 반영
  await rebuildFts5();

  logger.info("[UNIFIED-SEARCH] Complete update search data");
}
