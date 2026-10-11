

export interface AppConfig {
  common: {
    targetResource: string[];
  };
  pillData?: {
    createEffectSummary?: boolean;
  };
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
