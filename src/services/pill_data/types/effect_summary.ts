export interface EffectSummaryResult {
  summary: string;
  reason?: EffectFailureReason;
  httpStatus: number | null;
  attempts: number;
  message: string;
}

export interface EffectSummaryOptions {
  directory?: string;
  requestDelayMs?: number;
  retryDelayMs?: number;
  maxAttempts?: number;
  useCache?: boolean;
  fetchDocument?: (itemSeq: string) => Promise<string>;
  wait?: (ms: number) => Promise<void>;
  onResult?: (itemSeq: string, result: EffectSummaryResult) => Promise<void>;
}

export type EffectFailureReason = "http_error" | "network_error" | "empty_document" | "empty_summary" | "legacy_missing_summary" | "rate_limit_deferred";

export interface EffectSummaryFailure {
  ITEM_SEQ: string;
  reason: EffectFailureReason;
  httpStatus: number | null;
  attempts: number;
  message: string;
  firstFailedAt: string;
  lastFailedAt: string;
  previousSummary?: string | null;
}

/**
 * 최상위 괄호 바깥의 문장 종결 부호(;, 。, .)를 기준으로 문장을 분리한다.
 */
export interface SplitState {
  start: number;
  depth: number;
  parts: string[];
}

/**
 * 여러 효능 후보를 최대 길이에 맞추어 하나의 문자열로 압축·결합한다.
 */
export interface SummaryState {
  value: string;
  stopped: boolean;
}

/**
 * 효능 표현의 중요도를 계산하는 정규식과 점수.
 */
export interface EffectScoreRule {
  pattern: RegExp;
  score: number;
}
