import path from "path";
import { RESOURCE_DIRECTORY } from "../../shared/paths";
import { removeEffectSummaryFailure, writeAtomicFile } from "./effects/storage";
import { FALLBACK_EFFECT_SUMMARY } from "./effects/summary";
import logger from "../../shared/logging/logger";
import { ResourceLoader } from "../../infrastructure/resources/loader";
import { fetchEffectSummaryMap } from "./effects/client";
import { createPillData } from "./transform";

/**
 * pill_data 리소스 파일 생성
 */
export async function createPillDataResourceFile() {
  logger.info("[PILL-DATA] Start load resource");
  const resourceLoader = new ResourceLoader([
    "drug_recognition",
    "finished_medicine_permission_detail",
  ]);
  const resource = await resourceLoader.loadResource();
  logger.info("[PILL-DATA] Complete load resource");
  logger.info("[PILL-DATA] Start create pill data");
  const pillData = createPillData(resource.drugRecognition, resource.finishedMedicinePermissionDetail);
  logger.info("[PILL-DATA] Complete create pill data");
  logger.info("[PILL-DATA] Start fetch effect summaries");
  const itemSeqList = pillData.map(({ ITEM_SEQ }) => ITEM_SEQ);
  const effectSummaryMap = await fetchEffectSummaryMap(itemSeqList, 5, { useCache: false });
  pillData.forEach((pill) => {
    pill.EFFECT_SUMMARY = effectSummaryMap.get(pill.ITEM_SEQ) ?? null;
  });
  logger.info("[PILL-DATA] Complete fetch effect summaries");
  logger.info("[PILL-DATA] Start create pill data resource file");
  await writeAtomicFile(path.join(RESOURCE_DIRECTORY, "pill_data.json"), JSON.stringify({ resources: pillData }, null, 2));

  for (const [itemSeq, summary] of effectSummaryMap) {
    if (summary !== FALLBACK_EFFECT_SUMMARY) {
      await removeEffectSummaryFailure(itemSeq);
    }
  }
  logger.info("[PILL-DATA] Complete create pill data resource file");
}
