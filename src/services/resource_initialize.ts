import { logger, INITIAL_REALM_FILE_NAME } from "../utils";
import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  logger.info("Start load resource");
  const resourceLoader = new ResourceLoader();
  const { drugRecognition, finishedMedicinePermissionDetail } =
    await resourceLoader.loadResource();
  logger.info("Resource load complete");

  logger.info("Upsert drug recognition");
  new DrugRecognitionModel(INITIAL_REALM_FILE_NAME).upsertMany(
    drugRecognition
  );
  logger.info("Complete upsert drug recognition");

  logger.info("Upsert finished medicine permission detail");
  new FinishedMedicinePermissionDetailModel(
    INITIAL_REALM_FILE_NAME
  ).upsertMany(finishedMedicinePermissionDetail);
  logger.info("Complete upsert finished medicine permission detail");
}
