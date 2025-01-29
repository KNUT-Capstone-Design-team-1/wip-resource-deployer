import { logger, INITIAL_REALM_FILE_NAME } from "../utils";
import { PillDataModel } from "../models";
import { ResourceLoader } from "./resource_loader";
import * as PillDataService from "./pill_data";

export async function createInitialResourceFile() {
  logger.info("Start load resource");

  const resourceLoader = new ResourceLoader();
  const resource = await resourceLoader.loadResource();

  logger.info("Complete load resource");

  logger.info("Create pill data");

  const pillData = PillDataService.createPillData(
    resource.drugRecognition,
    resource.finishedMedicinePermissionDetail
  );

  logger.info("Complete pill data creation");

  logger.info("Upsert pill data");

  new PillDataModel(INITIAL_REALM_FILE_NAME).upsertMany(pillData);

  logger.info("Complete upsert pill data");

  logger.info("Complete upsert finished medicine permission detail");
}
