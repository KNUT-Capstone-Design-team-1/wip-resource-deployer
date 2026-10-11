import {
  IDrugRecognition,
  TDrugRecognitionResource,
} from "../../services/pill_data/types/drug_recognition";
import {
  IFinishedMedicinePermissionDetail,
  TFinishedMedicinePermissionDetailResource,
} from "../../services/pill_data/types/finished_medicine_permission_detail";
import { TCannabisResource } from "../../services/cannabis/types/cannabis";
import { TNarcoticsResource } from "../../services/narcotics/types/narcotics";
import { TpsychotropicsResource } from "../../services/psychotropics/types/psychotropics";
import {
  IProhibitedList,
  TProhibitedListResource,
} from "../../services/prohibited_list/types/prohibited_list";
import {
  IFunctionalFoodNutrients,
  TFunctionalFoodNutrientsResource,
} from "../../services/functional_food_nutrients/types/functional_food_nutrients";

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
