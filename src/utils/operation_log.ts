import logger from "./logger";
import { describeError } from "./error_details";

/**
 * 처리 단계 실행·시간 기록
 */
export async function runLoggedStage<T>(
  name: string,
  operation: () => T | Promise<T>,
): Promise<T> {
  const startedAt = Date.now();

  logger.info("[STAGE] Started name=%s", name);

  try {
    const result = await operation();

    logger.info(
      "[STAGE] Completed name=%s durationMs=%s",
      name,
      Date.now() - startedAt,
    );

    return result;
  } catch (error) {
    logger.error(
      "[STAGE] Failed name=%s durationMs=%s reason=%s",
      name,
      Date.now() - startedAt,
      describeError(error),
    );

    throw error;
  }
}
