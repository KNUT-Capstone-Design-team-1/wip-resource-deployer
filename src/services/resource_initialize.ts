import { logger, NEW_INITIAL_REALM_FILE_NAME } from "../utils";
import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
  RealmDatabase,
} from "../models/";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  logger.info("Start load resource");
  await RealmDatabase.initInstance(NEW_INITIAL_REALM_FILE_NAME);

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
