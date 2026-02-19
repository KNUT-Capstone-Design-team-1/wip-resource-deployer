import fs from "fs";
import path from "path";
import * as UnifiedSearchService from "./unified_search";
import { logger } from "../utils";

/**
 * 통합 검색 DB에 INSERT 하는데 실패한 데이터를 INSERT
 * @param filePath 통합 검색 DB에 INSERT 하는데 실패한 데이터 json 파일 위치
 */
async function insertFailedRetry(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);

    await UnifiedSearchService.insert(parsed);

    logger.info(
      "[UNIFIED-SEARCH-INSERT-FAILED] Success insert data. data %s",
      fileContent,
    );

    fs.unlinkSync(filePath);
  } catch (e) {
    logger.error(
      `[UNIFIED-SEARCH-INSERT-FAILED] Failed to read file %s. error: %s`,
      filePath,
      e.stack || e,
    );
  }
}

/**
 * 통합 검색 DB에 저장하지 못한 데이터들 INSERT 시도
 */
export async function insertFailedRetryAll() {
  const resourceDirectoryName = "unified_search_insert_failed";

  const dirPath = path.resolve(
    __dirname,
    `../../resources/${resourceDirectoryName}`,
  );

  try {
    fs.accessSync(dirPath);

    const files = fs.readdirSync(dirPath);

    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      await insertFailedRetry(path.resolve(dirPath, file));
    }
  } catch (e) {
    logger.error(
      "[UNIFIED-SEARCH-INSERT-FAILED] Failed to access diretory. error: %s",
      e.stack || e,
    );
  }
}
