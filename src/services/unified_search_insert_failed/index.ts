import fs from "node:fs";
import path from "node:path";

import { upsert } from "../unified_search/repository";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import logger from "../../utils/logger";

/**
 * 검색 저장 실패 재시도
 */
async function upsertFailedRetry(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);

    await upsert([parsed]);

    // DB 저장에 성공한 파일은 다음 레코드 처리 전에 즉시 제거
    fs.unlinkSync(filePath);

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
  // 검색 DB 저장에 실패한 레코드 디렉터리를 확인
  const directory = path.join(
    RESOURCE_DIRECTORY,
    "unified_search_insert_failed",
  );

  const exists = fs.existsSync(directory);

  if (!exists) {
    logger.info("[UNIFIED-SEARCH-UPSERT-FAILED] No failed records directory");

    return;
  }

  // 재처리할 JSON 레코드 파일만 수집
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  // 성공한 파일은 즉시 삭제하고 처리 완료 건수만 집계
  let succeededCount = 0;

  for (const file of files) {
    const filePath = path.join(directory, file.name);

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
