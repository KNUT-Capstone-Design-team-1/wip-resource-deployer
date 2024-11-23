import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
  RealmDatabase,
} from "../models";
import {
  CURRENT_INITIAL_REALM_FILE_NAME,
  logger,
  NEW_INITIAL_REALM_FILE_NAME,
  UPDATE_REALM_FILE_NAME,
} from "../utils";

export async function createUpdateResourceFile() {
  logger.info("Read all data of current resource");

  await RealmDatabase.initInstance(CURRENT_INITIAL_REALM_FILE_NAME);

  const currentResourceData = {
    drugPermission: new DrugRecognitionModel().readAll(),
    finisehdMedicinePermissionDetail:
      new FinishedMedicinePermissionDetailModel().readAll(),
  };

  logger.info("Read all data of new initial resource");

  await RealmDatabase.initInstance(NEW_INITIAL_REALM_FILE_NAME);

  const initialResourceData = {
    drugPermission: new DrugRecognitionModel().readAll(),
    finishedMedicinePermissionDetail:
      new FinishedMedicinePermissionDetailModel().readAll(),
  };

  // await RealmDatabase.initInstance(UPDATE_REALM_FILE_NAME);
}
