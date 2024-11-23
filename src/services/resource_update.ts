import _ from "lodash";
import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
  RealmDatabase,
} from "../models";
import {
  CURRENT_INITIAL_REALM_FILE_NAME,
  getObjectArrayDiff,
  logger,
  NEW_INITIAL_REALM_FILE_NAME,
  UPDATE_REALM_FILE_NAME,
} from "../utils";
import {
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
  TLoadedResource,
} from "../@types";

function createUpdateResourceData(
  newRes: TLoadedResource,
  currentRes: TLoadedResource
): TLoadedResource {
  const updateResourceData: TLoadedResource = {
    drugRecognition: [],
    finishedMedicinePermissionDetail: [],
  };

  updateResourceData.drugRecognition.push(
    ...(getObjectArrayDiff(
      newRes.drugRecognition,
      "ITEM_SEQ",
      currentRes.drugRecognition
    ) as Array<IDrugRecognition>)
  );

  updateResourceData.finishedMedicinePermissionDetail.push(
    ...(getObjectArrayDiff(
      newRes.finishedMedicinePermissionDetail,
      "ITEM_SEQ",
      currentRes.finishedMedicinePermissionDetail
    ) as Array<IFinishedMedicinePermissionDetail>)
  );

  return updateResourceData;
}

export async function createUpdateResourceFile() {
  logger.info("Read all data of current resource");

  await RealmDatabase.initInstance(CURRENT_INITIAL_REALM_FILE_NAME);

  const currentResourceData: TLoadedResource = {
    drugRecognition: new DrugRecognitionModel().readAll(),
    finishedMedicinePermissionDetail:
      new FinishedMedicinePermissionDetailModel().readAll(),
  };

  logger.info("Read all data of new initial resource");

  await RealmDatabase.initInstance(NEW_INITIAL_REALM_FILE_NAME);

  const initialResourceData: TLoadedResource = {
    drugRecognition: new DrugRecognitionModel().readAll(),
    finishedMedicinePermissionDetail:
      new FinishedMedicinePermissionDetailModel().readAll(),
  };

  logger.info("Create update resource data");

  const updateResourceData = createUpdateResourceData(
    initialResourceData,
    currentResourceData
  );

  const drugRecognitionUpdated = Boolean(
    updateResourceData.drugRecognition.length
  );
  const finishedMedicinePermissionDetailUpdated = Boolean(
    updateResourceData.finishedMedicinePermissionDetail.length
  );

  if (!drugRecognitionUpdated && !finishedMedicinePermissionDetailUpdated) {
    logger.info("No updated data");
    return;
  }

  logger.info("Update resource data is exist. create update resource file");

  await RealmDatabase.initInstance(UPDATE_REALM_FILE_NAME);

  if (drugRecognitionUpdated) {
    new DrugRecognitionModel().upsertMany(updateResourceData.drugRecognition);
  }

  if (finishedMedicinePermissionDetailUpdated) {
    new FinishedMedicinePermissionDetailModel().upsertMany(
      updateResourceData.finishedMedicinePermissionDetail
    );
  }

  logger.info("Create update resource file complete");
}
