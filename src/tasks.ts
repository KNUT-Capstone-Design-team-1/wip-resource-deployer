import type { AppConfig, ResourceTask } from "./types/resource_tasks";

/** 선택된 작업의 모듈만 로드하며 의존 순서대로 실행한다. */
export function createResourceTasks(config: AppConfig): ResourceTask[] {
  return [
    {
      name: "pill_data",
      execute: async () => {
        const { createPillDataResourceFile } =
          await import("./services/pill_data");
        return createPillDataResourceFile(config.pillData);
      },
    },
    {
      name: "pill_effect_summary_retry",
      execute: async () => {
        const { retryFailedPillEffectSummaries } =
          await import("./services/pill_effect_summary_retry");
        return retryFailedPillEffectSummaries();
      },
    },
    {
      name: "nearby_pharmacies",
      execute: async () => {
        const { createNearbyPharmaciesResource } =
          await import("./services/nearby_pharmacies");
        return createNearbyPharmaciesResource(config.nearbyPharmacies?.apiUrl);
      },
    },
    {
      name: "cannabis",
      execute: async () => {
        const { createCannabisResource } = await import("./services/cannabis");
        return createCannabisResource();
      },
    },
    {
      name: "narcotics",
      execute: async () => {
        const { createNarcoticsResource } =
          await import("./services/narcotics");
        return createNarcoticsResource();
      },
    },
    {
      name: "psychotropics",
      execute: async () => {
        const { createPsychotropicsResource } =
          await import("./services/psychotropics");
        return createPsychotropicsResource();
      },
    },
    {
      name: "prohibited_list",
      execute: async () => {
        const { createProhibitedListResource } =
          await import("./services/prohibited_list");
        return createProhibitedListResource();
      },
    },
    {
      name: "functional_food",
      execute: async () => {
        const { createFunctionalFoodResources } =
          await import("./services/functional_food");
        return createFunctionalFoodResources(config.functional_food);
      },
    },
    {
      name: "unified_search_restore_fts",
      execute: async () => {
        const { restoreUnifiedSearchFts } =
          await import("./services/unified_search_restore_fts");
        return restoreUnifiedSearchFts();
      },
    },
    {
      name: "unified_search",
      execute: async () => {
        if (config.unifiedSearch?.dbInitialize) {
          const { createTables } =
            await import("./services/unified_search_create_tables");
          await createTables();
        }
        const { updateUnifiedSearchDb } =
          await import("./services/unified_search");
        return updateUnifiedSearchDb();
      },
    },
    {
      name: "unified_search_insert_failed",
      execute: async () => {
        const { upsertFailedRetryAll } =
          await import("./services/unified_search_insert_failed");
        return upsertFailedRetryAll();
      },
    },
  ];
}
