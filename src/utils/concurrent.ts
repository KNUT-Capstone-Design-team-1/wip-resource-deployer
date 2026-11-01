/**
 * 제한 동시 처리
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  transform: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const isInvalidLimit = !Number.isSafeInteger(limit) || limit < 1;
  if (isInvalidLimit) {
    throw new Error("concurrency must be a positive integer");
  }

  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let hasFailed = false;

  /**
   * 대기 작업 순차 처리
   */
  async function worker() {
    while (nextIndex < items.length && !hasFailed) {
      const index = nextIndex++;

      try {
        results[index] = await transform(items[index], index);
      } catch (error) {
        hasFailed = true;

        throw error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );

  return results;
}
