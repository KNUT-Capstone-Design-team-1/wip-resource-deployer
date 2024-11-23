import { IDrugRecognition } from "./drug_recognition";
import { IFinishedMedicinePermissionDetail } from "./finished_medicine_permission_detail";

export type TDrugRecognitionDirectoryName = "drug_recognition";

export type TFinishedMedicinePermissionDetailDirectoryName =
  "finished_medicine_permission_detail";

export type TResourceDirectoryName =
  | TDrugRecognitionDirectoryName
  | TFinishedMedicinePermissionDetailDirectoryName;

export type TDrugRecognitionResourceObj = Record<
  "drugRecognition",
  Array<IDrugRecognition>
>;

export type TFinishedMedicinePermissionDetail = Record<
  "finishedMedicinePermissionDetail",
  Array<IFinishedMedicinePermissionDetail>
>;

export type TLoadedResource = TDrugRecognitionResourceObj &
  TFinishedMedicinePermissionDetail;

export type TResourceData =
  | Array<IDrugRecognition>
  | Array<IFinishedMedicinePermissionDetail>;
