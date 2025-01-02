import { logger, INITIAL_REALM_FILE_NAME, textToVector } from "../utils";
import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models";
import { ResourceLoader } from "./resource_loader";
import { IDrugRecognition } from "src/@types";

const modifyDrugRecognition = (data: Array<IDrugRecognition>) => {
  data.forEach((item) => {
    item.PRINT_FRONT = item.PRINT_FRONT.replace(/\u3000+|=+|\s{2, }/g, " ").replace(/-{2,}|분할선/g, (match) => {
      if (match === "분할선") return "|"
      return ""
    })
    item.PRINT_BACK = item.PRINT_BACK.replace(/\u3000+|=+|\s{2, }/g, " ").replace(/-{2,}|분할선/g, (match) => {
      if (match === "분할선") return "|"
      return ""
    })

    item.VECTOR = textToVector(item.PRINT_FRONT + item.PRINT_BACK)
  })
}

export async function createInitialResourceFile() {
  logger.info("Start load resource");
  const resourceLoader = new ResourceLoader();
  const { drugRecognition, finishedMedicinePermissionDetail } =
    await resourceLoader.loadResource();
  logger.info("Resource load complete");

  modifyDrugRecognition(drugRecognition)

  logger.info("Upsert drug recognition");
  new DrugRecognitionModel(INITIAL_REALM_FILE_NAME).upsertMany(
    drugRecognition
  );
  logger.info("Complete upsert drug recognition");

  logger.info("Upsert finished medicine permission detail");
  new FinishedMedicinePermissionDetailModel(
    INITIAL_REALM_FILE_NAME
  ).upsertMany(finishedMedicinePermissionDetail);
  logger.info("Complete upsert finished medicine permission detail");
}
