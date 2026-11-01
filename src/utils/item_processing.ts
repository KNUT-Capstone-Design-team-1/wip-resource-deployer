import logger from "./logger";
import { describeError } from "./error_details";

/**
 * 개별 항목 동기 처리
 */
export function tryItem<T>(operation: () => T, context: string): T | undefined {
  try {
    return operation();
  } catch (error) {
    logger.warn(
      "[RESOURCE] Skipped failed item context=%s reason=%s",
      context,
      describeError(error),
    );

    return undefined;
  }
}

/**
 * 개별 항목 비동기 처리
 */
export async function tryAsyncItem<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logger.warn(
      "[RESOURCE] Skipped failed item context=%s reason=%s",
      context,
      describeError(error),
    );

    return undefined;
  }
}
