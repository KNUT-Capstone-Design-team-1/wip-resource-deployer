import { PillDataOptions } from "../../types/resource_tasks";
import { createResourceFile } from "../../utils/resource_writer";
import { mapConcurrent } from "../../utils/concurrent";
import logger from "../../utils/logger";
import { removeEffectSummaryFailure } from "./effect_summary/storage";
import { enrichEffectSummaries } from "./effect_summary/enrich";
import { fetchPillDataSources } from "./client";
import { createPillData } from "./transform";
import { prepareMarkImages, saveMarkImages } from "../mark_images";

/**
 * 알약·마크 리소스 생성
 */
export async function createPillDataResourceFile(
  options: PillDataOptions = {},
): Promise<void> {
  logger.info("[PILL-DATA] Start fetching data from APIs");

  const sources = await fetchPillDataSources(
    options.drugRecognitionApiUrl,
    options.drugProductPermissionDetailApiUrl,
  );
  const pills = createPillData(
    sources.drugRecognition,
    sources.drugProductPermissionDetails,
  );

  const successfulIds = await enrichEffectSummaries(
    pills,
    options.createEffectSummary ?? true,
  );

  await createResourceFile("pill_data.json", pills);

  logger.info("[PILL-DATA] Saved pill_data.json");

  await mapConcurrent(successfulIds, 8, (itemSeq) =>
    removeEffectSummaryFailure(itemSeq),
  );

  const markImages = await prepareMarkImages(
    sources.drugRecognition,
    options.createMarkImage ?? true,
  );

  await saveMarkImages(markImages);

  logger.info("[PILL-DATA] Complete create pill data resource files");
}
