import type { AppConfig } from "./types/resource_tasks";
import { createCannabisResource } from "./services/cannabis";
import { createNarcoticsResource } from "./services/narcotics";
import { createPsychotropicsResource } from "./services/psychotropics";
import { createProhibitedListResource } from "./services/prohibited_list";
import { createFunctionalFoodNutrientsResource } from "./services/functional_food_nutrients";
import { createPillDataResourceFile } from "./services/pill_data";
import { retryFailedPillEffectSummaries } from "./services/pill_effect_summary_retry";
import { createNearbyPharmaciesResource } from "./services/nearby_pharmacies";
import { createMarkImageResource } from "./services/mark_images";
import { updateUnifiedSearchDB } from "./services/unified_search";
import { createTables } from "./services/unified_search_create_tables";
import { upsertFailedRetryAll } from "./services/unified_search_insert_failed";

/**
 * 설정에서 선택할 수 있는 리소스 작업을 등록하고 의존 작업의 실행 순서를 보장한다.
 */
export function createResourceTasks(config: AppConfig) {
  // 리소스 생성과 검색 DB 관리 작업을 의존 순서에 맞춰 등록한다.
  return [
    {
      name: "pill_data",
      execute: () => createPillDataResourceFile(config.pillData?.createEffectSummary ?? true),
    },
    {
      name: "pill_effect_summary_retry",
      execute: () => config.pillData?.createEffectSummary === false ? Promise.resolve() : retryFailedPillEffectSummaries()
    },
    {
      name: "nearby_pharmacies",
      execute: () => createNearbyPharmaciesResource(config.nearbyPharmacies?.apiUrl)
    },
    { name: "mark_images", execute: createMarkImageResource },
    { name: "unified_search_create_tables", execute: createTables },
    {
      name: "unified_search",
      execute: () => updateUnifiedSearchDB(config.unifiedSearch?.dbInitialize)
    },
    { name: "unified_search_insert_failed", execute: upsertFailedRetryAll },
    { name: "cannabis", execute: createCannabisResource },
    { name: "narcotics", execute: createNarcoticsResource },
    { name: "psychotropics", execute: createPsychotropicsResource },
    { name: "prohibited_list", execute: createProhibitedListResource },
    { name: "functional_food_nutrients", execute: createFunctionalFoodNutrientsResource },
  ];
}
