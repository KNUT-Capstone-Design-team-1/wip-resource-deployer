export interface EffectSummaryResult {
  summary: string;
  reason?: EffectFailureReason;
  httpStatus: number | null;
  attempts: number;
  message: string;
}

export interface EffectDocumentResponse {
  document: string;
  httpStatus: number;
  contentType?: string;
}

export interface EffectSummaryOptions {
  directory?: string;
  requestDelayMs?: number;
  retryDelayMs?: number;
  maxAttempts?: number;
  useCache?: boolean;
  fetchDocument?: (itemSeq: string) => Promise<string | EffectDocumentResponse>;
  wait?: (ms: number) => Promise<void>;
  onResult?: (itemSeq: string, result: EffectSummaryResult) => Promise<void>;
}

export type EffectFailureReason =
  | "http_error"
  | "network_error"
  | "empty_document"
  | "empty_summary"
  | "legacy_missing_summary"
  | "rate_limit_deferred";

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
 * 최상위 괄호 바깥의 문장 종결 부호(;, 。, .)를 기준으로 문장을 분리
 */
export interface SplitState {
  start: number;
  depth: number;
  parts: string[];
}
