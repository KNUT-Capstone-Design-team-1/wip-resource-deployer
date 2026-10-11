import logger from "../../utils/logger";
import { ResourceLoader } from "../../utils/resource_loader";
import { createPillData } from "../pill_data/transform";
import { createTables } from "../unified_search_create_tables";
import { upsertAll } from "./batches";
import { deleteRemovedItems } from "./repository";
import { rebuildFTS5 } from "./rebuild";

/**
 * 의약품 원본으로 검색 데이터를 갱신하고 필요 시 테이블을 초기화한다.
 */
export async function updateUnifiedSearchDB(dbInitialize = false) {
  // 검색에 필요한 낱알식별 정보와 의약품 허가 상세 원본을 읽는다.
  logger.info("[UNIFIED-SEARCH] Start load resource");

  const resources = await new ResourceLoader([
    "drug_recognition",
    "finished_medicine_permission_detail",
  ]).loadResource();

  // 두 원본을 결합해 검색 대상 의약품 목록을 만든다.
  const pills = createPillData(
    resources.drugRecognition,
    resources.finishedMedicinePermissionDetail,
  );

  // 초기화가 설정된 경우 검색 테이블과 동기화 트리거를 준비한다.
  if (dbInitialize) {
    await createTables();
  }

  // 의약품과 문서 내용을 검색 레코드로 만들어 배치 저장한다.
  await upsertAll(pills);

  // 현재 원본에 없는 의약품을 검색 DB에서 제거한다.
  await deleteRemovedItems(pills);

  // 저장과 삭제를 마친 검색 데이터 전체를 FTS 인덱스에 반영한다.
  await rebuildFTS5();

  logger.info("[UNIFIED-SEARCH] Complete update search data");
}
