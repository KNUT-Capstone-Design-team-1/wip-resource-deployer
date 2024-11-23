import {
  RealmDatabase,
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models/";
import { logger, INITIAL_REALM_FILE_NAME } from "../utils";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  logger.info("Create initial resource file");

  const resourceLoader = new ResourceLoader();
  const resource = await resourceLoader.loadResource();

  logger.info("Initial database");

  await RealmDatabase.initInstance(INITIAL_REALM_FILE_NAME);

  logger.info("Upsert to DrugPermission");

  const drugRecognitionModel = new DrugRecognitionModel();
  drugRecognitionModel.upsertMany(resource.drug_recognition);

  logger.info("Upsert to FinishedMedicinePermissionDetails");

  const finishedMedicinePermissionDetailsModel =
    new FinishedMedicinePermissionDetailModel();
  finishedMedicinePermissionDetailsModel.upsertMany(
    resource.finished_medicine_permission_details
  );
}
