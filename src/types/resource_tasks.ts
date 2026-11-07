import type { FunctionalFoodOptions } from "../services/functional_food/types";

export interface PillDataOptions {
  createEffectSummary?: boolean;
  createMarkImage?: boolean;
  drugRecognitionApiUrl?: string;
  drugProductPermissionDetailApiUrl?: string;
}

export interface AppConfig {
  common: {
    targetResource: string[];
  };
  pillData?: PillDataOptions;
  functional_food?: FunctionalFoodOptions;
  unifiedSearch?: {
    dbInitialize?: boolean;
  };
  nearbyPharmacies?: {
    apiUrl?: string;
  };
}

export interface ResourceTask {
  name: string;
  execute: () => Promise<unknown>;
}
