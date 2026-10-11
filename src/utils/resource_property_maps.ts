import { DRUG_RECOGNITION_PROPERTY_MAP } from "../services/pill_data/drug_recognition_property_map";
import { FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP } from "../services/pill_data/finished_medicine_permission_detail_property_map";
import { CANNABIS_PROPERTY_MAP } from "../services/cannabis/property_map";
import { NARCOTICS_PROPERTY_MAP } from "../services/narcotics/property_map";
import { psychotropics_PROPERTY_MAP } from "../services/psychotropics/property_map";
import { PROHIBITED_LIST_PROPERTY_MAP } from "../services/prohibited_list/property_map";
import { FUNCTIONAL_FOOD_NUTRIENTS_PROPERTY_MAP } from "../services/functional_food_nutrients/property_map";
import { TResourceDirectoryName } from "./types/resources";

/**
 * 리소스 별 프로퍼티 맵
 */
export const RESOURCE_PROPERTY_MAP: Record<
  TResourceDirectoryName,
  Record<string, string>
> = {
  drug_recognition: DRUG_RECOGNITION_PROPERTY_MAP,
  finished_medicine_permission_detail:
    FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  cannabis: CANNABIS_PROPERTY_MAP,
  narcotics: NARCOTICS_PROPERTY_MAP,
  psychotropics: psychotropics_PROPERTY_MAP,
  prohibited_list: PROHIBITED_LIST_PROPERTY_MAP,
  functional_food_nutrients: FUNCTIONAL_FOOD_NUTRIENTS_PROPERTY_MAP,
} as const;
