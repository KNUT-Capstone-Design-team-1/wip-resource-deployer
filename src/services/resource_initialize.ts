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
  drugRecognitionModel.upsertMany(resource.drugRecognition);
  logger.info("Upsert complete");

  logger.info("Upsert finished medicine permission detail");
  const finishedMedicinePermissionDetailModel =
    new FinishedMedicinePermissionDetailModel();
  finishedMedicinePermissionDetailModel.upsertMany(
    resource.finishedMedicinePermissionDetail
  );
  logger.info("Upsert complete");
}
