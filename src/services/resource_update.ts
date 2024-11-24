import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models";
import {
  CURRENT_INITIAL_REALM_FILE_NAME,
  getObjectArrayDiff,
  logger,
  INITIAL_REALM_FILE_NAME,
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
  const drugRecognition = getObjectArrayDiff(
    newRes.drugRecognition,
    "ITEM_SEQ",
    currentRes.drugRecognition
  ) as Array<IDrugRecognition>;

  const finishedMedicinePermissionDetail = getObjectArrayDiff(
    newRes.finishedMedicinePermissionDetail,
    "ITEM_SEQ",
    currentRes.finishedMedicinePermissionDetail
  ) as Array<IFinishedMedicinePermissionDetail>;

  const updateResourceData: TLoadedResource = {
    drugRecognition: [...drugRecognition],
    finishedMedicinePermissionDetail: [...finishedMedicinePermissionDetail],
  };

  return updateResourceData;
}

function getResourceData(realmFilePath: string): TLoadedResource {
  const drugRecognition = new DrugRecognitionModel(realmFilePath).readAll();

  const finishedMedicinePermissionDetail =
    new FinishedMedicinePermissionDetailModel(realmFilePath).readAll();

  return { drugRecognition, finishedMedicinePermissionDetail };
}

export async function createUpdateResourceFile() {
  logger.info("Create update resource data");
  const { drugRecognition, finishedMedicinePermissionDetail } =
    createUpdateResourceData(
      getResourceData(INITIAL_REALM_FILE_NAME),
      getResourceData(CURRENT_INITIAL_REALM_FILE_NAME)
    );

  const drugRecognitionUpdated = Boolean(drugRecognition.length);
  const finishedMedicinePermissionDetailUpdated = Boolean(
    finishedMedicinePermissionDetail.length
  );

  if (!drugRecognitionUpdated && !finishedMedicinePermissionDetailUpdated) {
    logger.info("No updated data");
    return;
  }

  logger.info("Update resource data is exist. create update resource file");

  if (drugRecognitionUpdated) {
    new DrugRecognitionModel(UPDATE_REALM_FILE_NAME).upsertMany(
      drugRecognition
    );
  }

  if (finishedMedicinePermissionDetailUpdated) {
    new FinishedMedicinePermissionDetailModel(
      UPDATE_REALM_FILE_NAME
    ).upsertMany(finishedMedicinePermissionDetail);
  }

  logger.info("Create update resource file complete");
}
