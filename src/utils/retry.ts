import axios from "axios";
import logger from "./logger";

export interface RetryOptions {
  context?: string;
  maxAttempts?: number;
  delayMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
}

/**
 * 재시도 간격 대기
 */
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * 일시적 통신 오류 확인
 */
export function isTransientRequestError(error: unknown): boolean {
  const isAxiosError = axios.isAxiosError(error);
  if (!isAxiosError) {
    return false;
  }

  const status = error.response?.status;

  const hasResponse = status !== undefined;
  if (hasResponse) {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  return [
    "ECONNABORTED",
    "ETIMEDOUT",
    "ECONNRESET",
    "EAI_AGAIN",
    "ERR_NETWORK",
  ].includes(error.code ?? "");
}

type AttemptResult<T> = { completed: true; value: T } | { completed: false };

/**
 * 요청 실행·재시도 판정
 */
async function runAttempt<T>(
  operation: () => Promise<T>,
  canRetry: boolean,
): Promise<AttemptResult<T>> {
  try {
    return { completed: true, value: await operation() };
  } catch (error) {
    const shouldFail = !canRetry || !isTransientRequestError(error);
    if (shouldFail) {
      throw error;
    }

    return { completed: false };
  }
}

/**
 * 재시도 설정 검증
 */
function validateRetryOptions(maxAttempts: number, delayMs: number): void {
  const isInvalidAttemptCount =
    !Number.isSafeInteger(maxAttempts) || maxAttempts < 1;
  if (isInvalidAttemptCount) {
    throw new Error("maxAttempts must be a positive integer");
  }

  const isInvalidDelay = !Number.isFinite(delayMs) || delayMs < 0;
  if (isInvalidDelay) {
    throw new Error("delayMs must be a non-negative finite number");
  }
}

/**
 * 통신 요청 제한 재시도
 */
export async function retryRequest<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    wait: pause = wait,
    context = "HTTP",
  } = options;
  validateRetryOptions(maxAttempts, delayMs);

  for (let attempt = 1; ; attempt += 1) {
    const result = await runAttempt(operation, attempt < maxAttempts);

    const isCompleted = result.completed;
    if (isCompleted) {
      return result.value;
    }

    const retryDelay = Math.min(delayMs * 2 ** (attempt - 1), 10000);

    logger.warn(
      "[HTTP] Retrying context=%s attempt=%s nextAttempt=%s maxAttempts=%s delayMs=%s",
      context,
      attempt,
      attempt + 1,
      maxAttempts,
      retryDelay,
    );

    await pause(retryDelay);
  }
}
