import {
  DrugRecognitionModel,
  FinishedMedicinePermissionDetailModel,
} from "../models/";
import { ResourceLoader } from "./resource_loader";

export async function createInitialResourceFile() {
  const resourceLoader = new ResourceLoader();
  const resource = await resourceLoader.loadResource();

  const drugRecognitionModel = new DrugRecognitionModel();
  drugRecognitionModel.upsertMany(resource.drug_recognition);

  const finishedMedicinePermissionDetailsModel =
    new FinishedMedicinePermissionDetailModel();
  finishedMedicinePermissionDetailsModel.upsertMany(
    resource.finished_medicine_permission_details
  );
}
