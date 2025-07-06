import { logger, INITIAL_REALM_FILE_NAME } from "../../utils";
import { PillDataModel } from "../../models";
import * as PillDataService from "./pill_data";
import { TLoadedResource } from "../../@types/resource";

export async function createInitialResourceFile(resource: TLoadedResource) {
  logger.info("Create pill data");

  const pillData = PillDataService.createPillData(
    resource.drugRecognition,
    resource.finishedMedicinePermissionDetail
  );

  logger.info("Complete pill data creation");

  logger.info("Upsert pill data. count: %s", pillData.length);

  new PillDataModel(INITIAL_REALM_FILE_NAME).upsertMany(pillData);

  logger.info("Complete upsert pill data");

  logger.info("Complete upsert finished medicine permission detail");
}
