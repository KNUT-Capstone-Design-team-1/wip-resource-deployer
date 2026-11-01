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
  | "cannabis"
  | "narcotics"
  | "psychotropics"
  | "prohibited_list"
  | "functional_food_nutrients";

export type TLoadedResource = TCannabisResource &
  TNarcoticsResource &
  TpsychotropicsResource &
  TProhibitedListResource &
  TFunctionalFoodNutrientsResource;

export type TResource = IProhibitedList | IFunctionalFoodNutrients;
