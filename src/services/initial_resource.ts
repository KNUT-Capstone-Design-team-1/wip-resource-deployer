import { logger } from "../utils";
import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models/";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  logger.info("Start load resource");
  const resourceLoader = new ResourceLoader();
  const resource = await resourceLoader.loadResource();
  logger.info("Resource load complete");

  logger.info("Upsert drug recognition");
  const drugRecognitionModel = new DrugRecognitionModel();
  drugRecognitionModel.upsertMany(resource.drug_recognition);
  logger.info("Upsert complete");

  logger.info("Upsert finished medicine permission detail");
  const finishedMedicinePermissionDetailModel =
    new FinishedMedicinePermissionDetailModel();
  finishedMedicinePermissionDetailModel.upsertMany(
    resource.finished_medicine_permission_detail
  );
  logger.info("Upsert complete");
}
