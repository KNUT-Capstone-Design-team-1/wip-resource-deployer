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
  TpsychotropicsResource,
  CANNABIS_PROPERTY_MAP,
  psychotropics_PROPERTY_MAP,
  NARCOTICS_PROPERTY_MAP,
} from "./";

export type TResourceDirectoryName =
  | "drug_recognition"
  | "finished_medicine_permission_detail"
  | "nearby_pharmacies"
  | "cannabis"
  | "narcotics"
  | "psychotropics";

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TNearbyPharmaciesResource &
  TCannabisResource &
  TNarcoticsResource &
  TpsychotropicsResource;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | INearbyPharmacies;
