import {
  IDrugRecognition,
  TDrugRecognitionResource,
  IFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailResource,
  INearbyPharmacies,
  TNearbyPharmaciesResource,
  TCannabisResource,
  TNarcoticsResource,
  TpsychotropicsResource,
  IProhibitedList,
  TProhibitedListResource,
} from "./";

export type TResourceDirectoryName =
  | "drug_recognition"
  | "finished_medicine_permission_detail"
  | "nearby_pharmacies"
  | "cannabis"
  | "narcotics"
  | "psychotropics"
  | "prohibited_list";

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TNearbyPharmaciesResource &
  TCannabisResource &
  TNarcoticsResource &
  TpsychotropicsResource &
  TProhibitedListResource;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | INearbyPharmacies
  | IProhibitedList;
