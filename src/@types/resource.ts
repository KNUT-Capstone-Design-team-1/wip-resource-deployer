import {
  INearbyPharmacies,
  TNearbyPharmaciesDirectoryName,
  TNearbyPharmaciesResource,
} from "./d1/nearby_pharmacies";
import {
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
  TDrugRecognitionDirectoryName,
  TDrugRecognitionRaw,
  TDrugRecognitionResource,
  TFinishedMedicinePermissionDetailResource,
  TFinishedMedicinePermissionDetailDirectoryName,
  TFinishedMedicinePermissionRaw,
} from "./realm";

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

export type TResourceType = "realm" | "d1";
