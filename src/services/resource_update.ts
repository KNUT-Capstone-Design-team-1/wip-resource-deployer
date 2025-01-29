import {
  PillDataModel,
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
  IPillData,
  IFinishedMedicinePermissionDetail,
  TLoadedResource,
} from "../@types";

function createUpdateResourceData(
  newRes: TLoadedResource,
  currentRes: TLoadedResource
): TLoadedResource {
  const pillData = getObjectArrayDiff(
    newRes.pillData,
    "ITEM_SEQ",
    currentRes.pillData
  ) as Array<IPillData>;

  const finishedMedicinePermissionDetail = getObjectArrayDiff(
    newRes.finishedMedicinePermissionDetail,
    "ITEM_SEQ",
    currentRes.finishedMedicinePermissionDetail
  ) as Array<IFinishedMedicinePermissionDetail>;

  const updateResourceData: TLoadedResource = {
    pillData: [...pillData],
    finishedMedicinePermissionDetail: [...finishedMedicinePermissionDetail],
  };

  return updateResourceData;
}

function getResourceData(realmFilePath: string): TLoadedResource {
  const pillData = new PillDataModel(realmFilePath).readAll();

  const finishedMedicinePermissionDetail =
    new FinishedMedicinePermissionDetailModel(realmFilePath).readAll();

  return { pillData, finishedMedicinePermissionDetail };
}

export async function createUpdateResourceFile() {
  logger.info("Compare initial resource current and new");
  const { pillData, finishedMedicinePermissionDetail } =
    createUpdateResourceData(
      getResourceData(INITIAL_REALM_FILE_NAME),
      getResourceData(CURRENT_INITIAL_REALM_FILE_NAME)
    );

  const pillDataUpdated = Boolean(pillData.length);
  const finishedMedicinePermissionDetailUpdated = Boolean(
    finishedMedicinePermissionDetail.length
  );

  if (!pillDataUpdated && !finishedMedicinePermissionDetailUpdated) {
    logger.info("No updated data");
    return;
  }

  logger.info("Update data is exist. create update resource file");

  if (pillDataUpdated) {
    new PillDataModel(UPDATE_REALM_FILE_NAME).upsertMany(
      pillData
    );
  }

  if (finishedMedicinePermissionDetailUpdated) {
    new FinishedMedicinePermissionDetailModel(
      UPDATE_REALM_FILE_NAME
    ).upsertMany(finishedMedicinePermissionDetail);
  }

  logger.info("Complete resource file for update");
}
