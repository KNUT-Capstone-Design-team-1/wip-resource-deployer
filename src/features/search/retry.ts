import fs from "fs";
import path from "path";
import { upsert } from "./repository";
import { RESOURCE_DIRECTORY } from "../../shared/paths";
import logger from "../../shared/logging/logger";
/**
 * 통합 검색 DB에 UPSERT 하는데 실패한 데이터를 UPSERT
 * @param filePath 통합 검색 DB에 UPSERT 하는데 실패한 데이터 json 파일 위치
 */
async function upsertFailedRetry(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    await upsert([parsed]);
    logger.info("[UNIFIED-SEARCH-UPSERT-FAILED] Success upsert data. data %s", fileContent);
    fs.unlinkSync(filePath);
  }
  catch (e: any) {
    logger.error(`[UNIFIED-SEARCH-UPSERT-FAILED] Failed to read file %s. error: %s`, filePath, e.stack || e);
  }
}
/**
 * 통합 검색 DB에 저장하지 못한 데이터들 UPSERT 시도
 */
export async function upsertFailedRetryAll(): Promise<void> {
  const directory = path.join(RESOURCE_DIRECTORY, "unified_search_insert_failed");
  const exists = fs.existsSync(directory);
  if (!exists) {
    logger.info("[UNIFIED-SEARCH-UPSERT-FAILED] No failed records directory");
    return;
  }
  const files = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  for (const file of files) {
    await upsertFailedRetry(path.join(directory, file.name));
  }
}
