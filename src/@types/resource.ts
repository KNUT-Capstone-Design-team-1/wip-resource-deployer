import {
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
  TDrugRecognitionDirectoryName,
  TDrugRecognitionRaw,
  TDrugRecognitionResource,
  TFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailDirectoryName,
  TFinishedMedicinePermissionRaw,
} from "./realm";

export type TResourceDirectoryName =
  | TDrugRecognitionDirectoryName
  | TFinishedMedicinePermissionDetailDirectoryName;

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetail;

export type TResourceRaw = TDrugRecognitionRaw | TFinishedMedicinePermissionRaw;

export type TResource = IDrugRecognition | IFinishedMedicinePermissionDetail;
