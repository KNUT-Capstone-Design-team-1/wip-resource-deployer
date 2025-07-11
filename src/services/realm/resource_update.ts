import fs from "fs";
import path from "path";
import { PillDataModel } from "../../models";
import {
  getObjectArrayDiff,
  logger,
  INITIAL_REALM_FILE_NAME,
  UPDATE_REALM_FILE_NAME,
  DATABASE_DIRECTORY_NAME,
} from "../../utils";
import { IPillData } from "../../@types/realm";
import config from "../../../config.json";

function getDeletedResource(
  newResources: Array<IPillData>,
  currentResources: Array<IPillData>
): Array<IPillData> {
  const deleted: Array<IPillData> = [];

  for (let i = 0; i < currentResources.length; i += 1) {
    const current = currentResources[i];

    const deletedFromNew = !newResources.some(
      ({ ITEM_SEQ }) => current?.ITEM_SEQ === ITEM_SEQ
    );

    if (deletedFromNew) {
      deleted.push({ ...current, DELETED: true });
    }
  }

  return deleted;
}

export async function createUpdateResourceFile() {
  logger.info("Compare initial resource current and new");

  const newResources = new PillDataModel(INITIAL_REALM_FILE_NAME).readAll();

  const currentResourceFilePath = path.join(DATABASE_DIRECTORY_NAME, "current");
  const currentResourceFiles = fs.readdirSync(currentResourceFilePath);
  const currentInitialResourceFileNames = currentResourceFiles.filter(
    (v) => v?.split("_")?.[3]?.split(".")?.[0] === config.schemaMinorVersion
  );
  const currentInitialResourceFileName = currentInitialResourceFileNames.at(-1);

  if (!currentInitialResourceFileName) {
    logger.info(
      `No current initial resource file. copy initial realm file to update realm file.`,
      currentResourceFilePath,
      currentResourceFiles.join(", ")
    );
    fs.copyFileSync(INITIAL_REALM_FILE_NAME, UPDATE_REALM_FILE_NAME);
    return;
  }

  const currentResources = new PillDataModel(
    path.join(currentResourceFilePath, currentInitialResourceFileName as string)
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
    logger.info("No updated data. copy initial realm file to update realm file.");
    fs.copyFileSync(INITIAL_REALM_FILE_NAME, UPDATE_REALM_FILE_NAME);
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
