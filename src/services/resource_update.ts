import { PillDataModel } from "../models";
import {
  CURRENT_INITIAL_REALM_FILE_NAME,
  getObjectArrayDiff,
  logger,
  INITIAL_REALM_FILE_NAME,
  UPDATE_REALM_FILE_NAME,
} from "../utils";
import { IPillData } from "../@types";

export async function createUpdateResourceFile() {
  logger.info("Compare initial resource current and new");

  const newResources = new PillDataModel(INITIAL_REALM_FILE_NAME).readAll();

  const currentResources = new PillDataModel(
    CURRENT_INITIAL_REALM_FILE_NAME
  ).readAll();

  const diff = getObjectArrayDiff(
    newResources,
    "ITEM_SEQ",
    currentResources
  ) as Array<IPillData>;

  const pillDataUpdated = Boolean(diff.length);

  if (!pillDataUpdated) {
    logger.info("No updated data");
    return;
  }

  logger.info(
    "Update data is exist. create update resource file. new: %s, current: %s, diff: %s",
    newResources.length,
    currentResources.length,
    diff.length
  );

  new PillDataModel(UPDATE_REALM_FILE_NAME).upsertMany(diff);

  logger.info("Complete resource file for update");
}
