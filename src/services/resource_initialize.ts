import {
  logger,
  INITIAL_REALM_FILE_NAME,
  replacePillData,
  optimizePillData,
} from "../utils";
import {
  PillDataModel,
  FinishedMedicinePermissionDetailModel,
} from "../models";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  const resourceLoadMode = {
    initial: false,
    update: true,
  }[process.argv[2] || "initial"];

  console.log(process.argv[2]);

  logger.info("Start load resource");
  const resourceLoader = new ResourceLoader();
  const { pillData, finishedMedicinePermissionDetail } =
    await resourceLoader.loadResource(resourceLoadMode);
  logger.info("Resource load complete");

  // Pill Data 데이터 최적화
  logger.info("Start optimize pill data");
  replacePillData(pillData);
  const optimizedPillData = optimizePillData(
    pillData,
    finishedMedicinePermissionDetail
  );
  logger.info("Complete optimize pill data");

  logger.info("Upsert pill data");
  new PillDataModel(INITIAL_REALM_FILE_NAME).upsertMany(optimizedPillData);
  logger.info("Complete upsert pill data");

  logger.info("Upsert finished medicine permission detail");
  new FinishedMedicinePermissionDetailModel(INITIAL_REALM_FILE_NAME).upsertMany(
    finishedMedicinePermissionDetail
  );
  logger.info("Complete upsert finished medicine permission detail");
}
