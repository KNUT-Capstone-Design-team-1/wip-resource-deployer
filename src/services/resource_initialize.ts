import { logger, INITIAL_REALM_FILE_NAME, replaceDrugRecognition, optimizeDrugRecognition } from "../utils";
import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  logger.info("Start load resource");
  const resourceLoader = new ResourceLoader();
  const { drugRecognition, finishedMedicinePermissionDetail } =
    await resourceLoader.loadResource(true);
  logger.info("Resource load complete");

  // Drug Recognition 데이터 최적화
  logger.info("Start optimize drug recognition")
  replaceDrugRecognition(drugRecognition)
  const optimizedDrugRecognition = optimizeDrugRecognition(drugRecognition, finishedMedicinePermissionDetail)
  logger.info("Complete optimize drug recognition")

  logger.info("Upsert drug recognition");
  new DrugRecognitionModel(INITIAL_REALM_FILE_NAME).upsertMany(
    optimizedDrugRecognition
  );
  logger.info("Complete upsert drug recognition");

  logger.info("Upsert finished medicine permission detail");
  new FinishedMedicinePermissionDetailModel(
    INITIAL_REALM_FILE_NAME
  ).upsertMany(finishedMedicinePermissionDetail);
  logger.info("Complete upsert finished medicine permission detail");
}
