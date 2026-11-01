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
