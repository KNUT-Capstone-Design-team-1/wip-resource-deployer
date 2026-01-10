import {
  IDrugRecognition,
  TDrugRecognitionDirectoryName,
  TDrugRecognitionRaw,
  TDrugRecognitionResource,
  IFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailDirectoryName,
  TFinishedMedicinePermissionDetailResource,
  TFinishedMedicinePermissionRaw,
  INearbyPharmacies,
  TNearbyPharmaciesDirectoryName,
  TNearbyPharmaciesResource,
} from "./";

export type TResourceDirectoryName =
  | TDrugRecognitionDirectoryName
  | TFinishedMedicinePermissionDetailDirectoryName
  | TNearbyPharmaciesDirectoryName;

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TNearbyPharmaciesResource;

export type TResourceRaw = TDrugRecognitionRaw | TFinishedMedicinePermissionRaw;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | INearbyPharmacies;
