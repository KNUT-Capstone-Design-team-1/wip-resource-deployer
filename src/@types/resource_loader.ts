import { IDrugRecognition } from "./drug_recognition";
import { IFinishedMedicinePermissionDetails } from "./finished_medicine_permission_details";

export type TDrugRecognitionKey = "drug_recognition";

export type TFinishedMedicinePermissionDetailsKey =
  "finished_medicine_permission_details";

export type TDrugRecognitionResourceObj = Record<
  TDrugRecognitionKey,
  Array<IDrugRecognition>
>;

export type TFinishedMedicinePermissionDetails = Record<
  TFinishedMedicinePermissionDetailsKey,
  Array<IFinishedMedicinePermissionDetails>
>;

export type TLoadedResource = TDrugRecognitionResourceObj &
  TFinishedMedicinePermissionDetails;

export type TResourceKey =
  | TDrugRecognitionKey
  | TFinishedMedicinePermissionDetailsKey;

export type TResourceData =
  | Array<IDrugRecognition>
  | Array<IFinishedMedicinePermissionDetails>;
