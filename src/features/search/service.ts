import logger from "../../shared/logging/logger";
import { ResourceLoader } from "../../infrastructure/resources/loader";
import { createPillData } from "../pills/transform";
import { createTables } from "./schema";
import { upsertAll } from "./batches";
import { deleteRemovedItems } from "./repository";
export async function updateUnifiedSearchDB(dbInitialize = false): Promise<void> {
  logger.info("[UNIFIED-SEARCH] Start load resource");
  const resources = await new ResourceLoader([
    "drug_recognition",
    "finished_medicine_permission_detail",
  ]).loadResource();
  const pills = createPillData(resources.drugRecognition, resources.finishedMedicinePermissionDetail);
  if (dbInitialize) {
    await createTables();
  }
  await upsertAll(pills);
  await deleteRemovedItems(pills);
  logger.info("[UNIFIED-SEARCH] Complete update search data");
}
