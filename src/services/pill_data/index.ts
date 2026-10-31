import path from "node:path";

import { writeAtomicFile } from "../../utils/atomic_file";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { removeEffectSummaryFailure } from "./effect_summary/storage";
import { FALLBACK_EFFECT_SUMMARY } from "./effect_summary/summary";
import logger from "../../utils/logger";
import { ResourceLoader } from "../../utils/resource_loader";
import { fetchEffectSummaryMap } from "./effect_summary/client";
import { createPillData } from "./transform";
import {
  readExistingPillData,
  preserveUnchangedPillSummaries,
} from "./existing_resource";

/**
 * pill_data 리소스 파일 생성
 */
export async function createPillDataResourceFile(createEffectSummary = true) {
  // 낱알식별 정보와 의약품 허가 상세 원본을 읽기
  logger.info("[PILL-DATA] Start load resource");

  const resourceLoader = new ResourceLoader([
    "drug_recognition",
    "finished_medicine_permission_detail",
  ]);
  const resource = await resourceLoader.loadResource();

  logger.info("[PILL-DATA] Complete load resource");

  // 품목 ID를 기준으로 두 원본을 결합해 알약 데이터를 생성
  logger.info("[PILL-DATA] Start create pill data");

  const pillData = createPillData(
    resource.drugRecognition,
    resource.finishedMedicinePermissionDetail,
  );

  logger.info("[PILL-DATA] Complete create pill data");

  const resourcePath = path.join(RESOURCE_DIRECTORY, "pill_data.json");
  const existingPills = await readExistingPillData(resourcePath);
  const preserved = preserveUnchangedPillSummaries(pillData, existingPills);
  const summaryTargets = pillData.filter(
    (pill) => !preserved.has(pill.ITEM_SEQ),
  );
  const shouldFetchEffectSummaries =
    createEffectSummary && summaryTargets.length > 0;

  let effectSummaryMap = new Map<string, string>();

  if (shouldFetchEffectSummaries) {
    // 품목별 효능 원문 캐시를 우선 사용하고 필요하면 조회해 요약을 생성
    logger.info("[PILL-DATA] Start fetch effect summaries");

    const itemSeqList = summaryTargets.map(({ ITEM_SEQ }) => ITEM_SEQ);

    effectSummaryMap = await fetchEffectSummaryMap(itemSeqList);

    // 생성한 효능 요약을 각 알약 데이터에 반영
    pillData.forEach((pill) => {
      const summary = effectSummaryMap.get(pill.ITEM_SEQ);
      const hasValidSummary =
        Boolean(summary) && summary !== FALLBACK_EFFECT_SUMMARY;

      if (hasValidSummary) {
        pill.EFFECT_SUMMARY = summary;
      }
    });
    logger.info("[PILL-DATA] Complete fetch effect summaries");
  }

  // 완성된 리소스를 임시 파일에 쓴 뒤 출력 파일을 교체
  logger.info("[PILL-DATA] Start create pill data resource file");
  await writeAtomicFile(
    resourcePath,
    JSON.stringify(
      {
        resources: pillData,
      },
      null,
      2,
    ),
  );

  // 리소스 저장을 마친 정상 요약의 실패 기록을 제거
  for (const [itemSeq, summary] of effectSummaryMap) {
    const hasValidSummary = summary !== FALLBACK_EFFECT_SUMMARY;

    if (hasValidSummary) {
      await removeEffectSummaryFailure(itemSeq);
    }
  }

  logger.info("[PILL-DATA] Complete create pill data resource file");
}
