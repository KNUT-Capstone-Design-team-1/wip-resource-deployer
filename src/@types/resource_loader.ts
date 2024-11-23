import { IDrugRecognition } from "./drug_recognition";
import { IFinishedMedicinePermissionDetail } from "./finished_medicine_permission_detail";

export type TDrugRecognitionKey = "drug_recognition";

export type TFinishedMedicinePermissionDetailKey =
  "finished_medicine_permission_detail";

export type TDrugRecognitionResourceObj = Record<
  TDrugRecognitionKey,
  Array<IDrugRecognition>
>;

export type TFinishedMedicinePermissionDetail = Record<
TFinishedMedicinePermissionDetailKey,
  Array<IFinishedMedicinePermissionDetail>
>;

export type TLoadedResource = TDrugRecognitionResourceObj &
  TFinishedMedicinePermissionDetail;

export type TResourceKey =
  | TDrugRecognitionKey
  | TFinishedMedicinePermissionDetailKey;

export type TResourceData =
  | Array<IDrugRecognition>
  | Array<IFinishedMedicinePermissionDetail>;
