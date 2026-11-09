import { upsert } from "../unified_search/repository";
import {
  listFailedDataFiles,
  readFailedData,
  removeFailedData,
} from "../unified_search/failed_records";
import logger from "../../utils/logger";

/**
 * 검색 저장 실패 재시도
 */
async function upsertFailedRetry(filePath: string) {
  try {
    const record = await readFailedData(filePath);

    await upsert([record]);

    // DB 저장에 성공한 파일은 다음 레코드 처리 전에 즉시 제거
    await removeFailedData(filePath);

    logger.info(
      "[UNIFIED-SEARCH-UPSERT-FAILED] Upserted and removed file=%s",
      filePath,
    );

    return true;
  } catch (error: any) {
    logger.error(
      `[UNIFIED-SEARCH-UPSERT-FAILED] Failed to retry or remove file %s. error: %s`,
      filePath,
      error.stack || error,
    );

    return false;
  }
}

/**
 * 전체 검색 실패 재시도
 */
export async function upsertFailedRetryAll() {
  const files = await listFailedDataFiles();

  // 성공한 파일은 즉시 삭제하고 처리 완료 건수만 집계
  let succeededCount = 0;

  for (const filePath of files) {
    const succeeded = await upsertFailedRetry(filePath);

    if (succeeded) {
      succeededCount += 1;
    }
  }

  // FTS는 UPSERT 시 DB 트리거가 자동 동기화
  logger.info(
    "[UNIFIED-SEARCH-UPSERT-FAILED] Completed total=%s succeeded=%s failed=%s",
    files.length,
    succeededCount,
    files.length - succeededCount,
  );
}
