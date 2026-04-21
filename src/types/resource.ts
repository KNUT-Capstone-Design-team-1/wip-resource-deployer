import {
  IDrugRecognition,
  TDrugRecognitionResource,
  IFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailResource,
  INearbyPharmacies,
  TNearbyPharmaciesResource,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  DRUG_RECOGNITION_PROPERTY_MAP,
  TCannabisResource,
  TNarcoticsResource,
  TPasychotropicsResource,
  CANNABIS_PROPERTY_MAP,
  PASYCHOTROPICS_PROPERTY_MAP,
  NARCOTICS_PROPERTY_MAP,
} from "./";

export type TResourceDirectoryName =
  | "drug_recognition"
  | "finished_medicine_permission_detail"
  | "nearby_pharmacies"
  | "cannabis"
  | "narcotics"
  | "pasychotropics";

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TNearbyPharmaciesResource &
  TCannabisResource &
  TNarcoticsResource &
  TPasychotropicsResource;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | INearbyPharmacies;
