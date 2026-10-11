

export interface AppConfig {
  common: {
    targetResource: string[];
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
