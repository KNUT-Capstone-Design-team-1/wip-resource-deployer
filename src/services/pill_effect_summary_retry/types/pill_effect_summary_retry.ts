import type { IPillData } from "../../pill_data/types/pill_data";
import type { EffectSummaryOptions } from "../../pill_data/types/effect_summary";

export interface PillResourceFile {
  resources: IPillData[];
  [key: string]: unknown;
}

export interface EffectRetryOptions extends EffectSummaryOptions {
  limit?: number;
  checkpointSize?: number;
}
