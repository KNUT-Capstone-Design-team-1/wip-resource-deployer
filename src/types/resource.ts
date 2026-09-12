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
  IFunctionalFoodNutrients,
  TFunctionalFoodNutrientsResource,
} from "./";

export type TResourceDirectoryName =
  | "drug_recognition"
  | "finished_medicine_permission_detail"
  | "nearby_pharmacies"
  | "cannabis"
  | "narcotics"
  | "psychotropics"
  | "prohibited_list"
  | "functional_food_nutrients";

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TNearbyPharmaciesResource &
  TCannabisResource &
  TNarcoticsResource &
  TpsychotropicsResource &
  TProhibitedListResource &
  TFunctionalFoodNutrientsResource;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | INearbyPharmacies
  | IProhibitedList
  | IFunctionalFoodNutrients;
