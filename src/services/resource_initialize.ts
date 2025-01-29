import { logger, INITIAL_REALM_FILE_NAME, replacePillData, optimizePillData } from "../utils";
import {
  PillDataModel,
  FinishedMedicinePermissionDetailModel,
} from "../models";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  logger.info("Start load resource");
  const resourceLoader = new ResourceLoader();
  const { pillData, finishedMedicinePermissionDetail } =
    await resourceLoader.loadResource(true);
  logger.info("Resource load complete");

  // Drug Recognition 데이터 최적화
  logger.info("Start optimize drug recognition")
  replacePillData(pillData)
  const optimizedPillData = optimizePillData(pillData, finishedMedicinePermissionDetail)
  logger.info("Complete optimize drug recognition")

  logger.info("Upsert drug recognition");
  new PillDataModel(INITIAL_REALM_FILE_NAME).upsertMany(
    optimizedPillData
  );
  logger.info("Complete upsert drug recognition");

  logger.info("Upsert finished medicine permission detail");
  new FinishedMedicinePermissionDetailModel(
    INITIAL_REALM_FILE_NAME
  ).upsertMany(finishedMedicinePermissionDetail);
  logger.info("Complete upsert finished medicine permission detail");
}
