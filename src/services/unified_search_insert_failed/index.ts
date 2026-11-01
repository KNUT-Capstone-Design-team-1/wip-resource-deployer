import fs from "node:fs";
import path from "node:path";

import { upsert } from "../unified_search/repository";
import { rebuildFts5 } from "../unified_search/rebuild";
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
    logger.info(
      "[UNIFIED-SEARCH-UPSERT-FAILED] Success upsert data. data %s",
      fileContent,
    );

    return true;
  } catch (error: any) {
    logger.error(
      `[UNIFIED-SEARCH-UPSERT-FAILED] Failed to read file %s. error: %s`,
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

  // 실패 레코드를 순차 저장하고 성공한 파일 경로를 수집
  const succeededFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(directory, file.name);

    const succeeded = await upsertFailedRetry(filePath);

    if (succeeded) {
      succeededFiles.push(filePath);
    }
  }

  const hasNoRecoveredFiles = succeededFiles.length === 0;

  if (hasNoRecoveredFiles) {
    return;
  }

  // 복구한 데이터가 있으면 마지막에 FTS 인덱스를 한 번 재구축
  await rebuildFts5();

  // DB 저장과 인덱스 재구축을 모두 마친 항목의 실패 파일만 제거
  removeRecoveredFiles(succeededFiles);
}

/**
 * 복구 완료 파일 제거
 */
function removeRecoveredFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    fs.unlinkSync(filePath);
  }
}
