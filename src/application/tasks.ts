import { createCatalogResource } from "../features/catalogs/service";
import { AppConfig } from "./config";
import { createPillDataResourceFile } from "../features/pills/service";
import { createNearbyPharmaciesResource } from "../features/pharmacies/service";
import { createMarkImageResource } from "../features/mark-images/service";
import { updateUnifiedSearchDB } from "../features/search/service";
import { createTables } from "../features/search/schema";
import { rebuildFTS5 } from "../features/search/rebuild";
import { upsertFailedRetryAll } from "../features/search/retry";
export interface ResourceTask {
  name: string;
  execute: () => Promise<unknown>;
}
/** 기존 순서를 유지한다. 검색 초기화와 갱신 등 의존 작업은 순차 실행한다. */
export function createResourceTasks(config: AppConfig): ResourceTask[] {
  return [
    { name: "pill_data", execute: createPillDataResourceFile },
    { name: "nearby_pharmacies", execute: () => createNearbyPharmaciesResource(config.nearbyPharmacies?.apiUrl) },
    { name: "mark_images", execute: createMarkImageResource },
    { name: "unified_search", execute: () => updateUnifiedSearchDB(config.unifiedSearch?.dbInitialize) },
    { name: "unified_search_create_tables", execute: createTables },
    { name: "unified_search_fts_rebuild", execute: rebuildFTS5 },
    { name: "unified_search_insert_failed", execute: upsertFailedRetryAll },
    { name: "cannabis", execute: () => createCatalogResource("cannabis") },
    { name: "narcotics", execute: () => createCatalogResource("narcotics") },
    { name: "psychotropics", execute: () => createCatalogResource("psychotropics") },
    { name: "prohibited_list", execute: () => createCatalogResource("prohibited_list") },
    { name: "functional_food_nutrients", execute: () => createCatalogResource("functional_food_nutrients") },
  ];
}
