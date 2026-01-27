import {
  IDrugRecognition,
  TDrugRecognitionDirectoryName,
  TDrugRecognitionResource,
  IFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailDirectoryName,
  TFinishedMedicinePermissionDetailResource,
  INearbyPharmacies,
  TNearbyPharmaciesDirectoryName,
  TNearbyPharmaciesResource,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  DRUG_RECOGNITION_PROPERTY_MAP,
} from "./";

export type TResourceDirectoryName =
  | TDrugRecognitionDirectoryName
  | TFinishedMedicinePermissionDetailDirectoryName
  | TNearbyPharmaciesDirectoryName;

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TNearbyPharmaciesResource;

export type TResourceRaw = typeof DRUG_RECOGNITION_PROPERTY_MAP | typeof FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | INearbyPharmacies;
