import fs from "fs";
import path from "path";
import { upsert } from "../unified_search/repository";
import { rebuildFTS5 } from "../unified_search/rebuild";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import logger from "../../utils/logger";

/**
 * 통합 검색 DB에 UPSERT 하는데 실패한 데이터를 UPSERT
 * @param filePath 통합 검색 DB에 UPSERT 하는데 실패한 데이터 json 파일 위치
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
  } catch (e: any) {
    logger.error(
      `[UNIFIED-SEARCH-UPSERT-FAILED] Failed to read file %s. error: %s`,
      filePath,
      e.stack || e,
    );

    return false;
  }
}

/**
 * 통합 검색 DB에 저장하지 못한 데이터들 UPSERT 시도
 */
export async function upsertFailedRetryAll() {
  // 검색 DB 저장에 실패한 레코드 디렉터리를 확인한다.
  const directory = path.join(
    RESOURCE_DIRECTORY,
    "unified_search_insert_failed",
  );
  const exists = fs.existsSync(directory);

  if (!exists) {
    logger.info("[UNIFIED-SEARCH-UPSERT-FAILED] No failed records directory");

    return;
  }

  // 재처리할 JSON 레코드 파일만 수집한다.
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  // 실패 레코드를 순차 저장하고 성공한 파일 경로를 모은다.
  const succeededFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(directory, file.name);
    const succeeded = await upsertFailedRetry(filePath);

    if (succeeded) {
      succeededFiles.push(filePath);
    }
  }

  if (succeededFiles.length === 0) {
    return;
  }

  // 복구한 데이터가 있으면 마지막에 FTS 인덱스를 한 번 재구축한다.
  await rebuildFTS5();

  // DB 저장과 인덱스 재구축을 모두 마친 항목의 실패 파일만 제거한다.
  for (const filePath of succeededFiles) {
    fs.unlinkSync(filePath);
  }
}
