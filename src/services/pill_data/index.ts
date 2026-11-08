import { PillDataOptions } from "../../types/resource_tasks";
import { createResourceFile } from "../../utils/resource_writer";
import { mapConcurrent } from "../../utils/concurrent";
import logger from "../../utils/logger";
import { runLoggedStage } from "../../utils/operation_log";
import { tryAsyncItem } from "../../utils/item_processing";
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
  const startedAt = Date.now();

  logger.info(
    "[PILL-DATA] Build started effectSummary=%s markImage=%s",
    options.createEffectSummary ?? true,
    options.createMarkImage ?? true,
  );

  const sources = await runLoggedStage("PILL-DATA:API", () =>
    fetchPillDataSources(
      options.drugRecognitionApiUrl,
      options.drugProductPermissionDetailApiUrl,
    ),
  );

  logger.info(
    "[PILL-DATA] Sources ready recognition=%s permissions=%s",
    sources.drugRecognition.length,
    sources.drugProductPermissionDetails.length,
  );

  const pills = await runLoggedStage("PILL-DATA:MERGE", () =>
    createPillData(
      sources.drugRecognition,
      sources.drugProductPermissionDetails,
    ),
  );

  logger.info(
    "[PILL-DATA] Merge completed recognition=%s permissions=%s outputRecords=%s",
    sources.drugRecognition.length,
    sources.drugProductPermissionDetails.length,
    pills.length,
  );

  const successfulIds = await enrichEffectSummaries(
    pills,
    options.createEffectSummary ?? true,
  );

  await createResourceFile("pill_data.json", pills);

  await runLoggedStage("PILL-DATA:SUMMARY-CLEANUP", () =>
    mapConcurrent(successfulIds, 8, (itemSeq) =>
      tryAsyncItem(
        () => removeEffectSummaryFailure(itemSeq),
        "summary cleanup ITEM_SEQ=" + itemSeq,
      ),
    ),
  );

  const markImages = await runLoggedStage("PILL-DATA:MARK-IMAGES", () =>
    prepareMarkImages(sources.drugRecognition, options.createMarkImage ?? true),
  );

  await saveMarkImages(markImages);

  logger.info(
    "[PILL-DATA] Build completed records=%s updatedSummaries=%s durationMs=%s",
    pills.length,
    successfulIds.length,
    Date.now() - startedAt,
  );
}
