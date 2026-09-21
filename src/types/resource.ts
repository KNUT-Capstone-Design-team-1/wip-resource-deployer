import {
  IDrugRecognition,
  TDrugRecognitionResource,
  IFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailResource,
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
  | "cannabis"
  | "narcotics"
  | "psychotropics"
  | "prohibited_list"
  | "functional_food_nutrients";

export type TLoadedResource = TDrugRecognitionResource &
  TFinishedMedicinePermissionDetailResource &
  TCannabisResource &
  TNarcoticsResource &
  TpsychotropicsResource &
  TProhibitedListResource &
  TFunctionalFoodNutrientsResource;

export type TResource =
  | IDrugRecognition
  | IFinishedMedicinePermissionDetail
  | IProhibitedList
  | IFunctionalFoodNutrients;
