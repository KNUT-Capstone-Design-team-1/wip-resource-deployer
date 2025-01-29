import { PillDataModel } from "../models";
import {
  CURRENT_INITIAL_REALM_FILE_NAME,
  getObjectArrayDiff,
  logger,
  INITIAL_REALM_FILE_NAME,
  UPDATE_REALM_FILE_NAME,
} from "../utils";
import { IPillData } from "../@types";

function getDeletedResource(
  newResources: Array<IPillData>,
  currentResources: Array<IPillData>
): Array<IPillData> {
  const deleted: Array<IPillData> = [];

  currentResources.forEach((current) => {
    const deletedFromNew = !newResources.some(
      ({ ITEM_SEQ }) => current.ITEM_SEQ === ITEM_SEQ
    );

    if (!deletedFromNew) {
      return;
    }

    deleted.push({ ...current, DELETED: true });
  });

  return deleted;
}

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

  const deleted = getDeletedResource(newResources, currentResources);
  diff.push(...deleted);

  const pillDataUpdated = Boolean(diff.length);

  if (!pillDataUpdated) {
    logger.info("No updated data");
    return;
  }

  logger.info(
    "Update data is exist. create update resource file. new: %s, current: %s, diff: %s, deleted: %s",
    newResources.length,
    currentResources.length,
    diff.length,
    deleted.length
  );

  new PillDataModel(UPDATE_REALM_FILE_NAME).upsertMany(diff);

  logger.info("Complete resource file for update");
}
