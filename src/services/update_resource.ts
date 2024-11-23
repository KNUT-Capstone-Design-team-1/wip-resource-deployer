import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
  RealmDatabase,
} from "../models";
import {
  CURRENT_INITIAL_REALM_FILE_NAME,
  logger,
  UPDATE_REALM_FILE_NAME,
} from "../utils";

export async function createUpdateResourceFile() {
  await RealmDatabase.initInstance(CURRENT_INITIAL_REALM_FILE_NAME);

  logger.info("Read all data of initial resource");
  const initialResourceData = {
    drugPermission: new DrugRecognitionModel().readAll(),
    finisehdMedicinePermissionDetail: new FinishedMedicinePermissionDetailModel().readAll(),
  }

  await RealmDatabase.initInstance(UPDATE_REALM_FILE_NAME);
}
