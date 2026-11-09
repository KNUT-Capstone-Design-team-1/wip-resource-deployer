import fs from "node:fs";
import path from "node:path";

import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { IUnifiedSearchData } from "./types/unified_search";

const FAILED_DIRECTORY = path.join(
  RESOURCE_DIRECTORY,
  "unified_search_insert_failed",
);

/**
 * 검색 실패 레코드 저장
 */
export async function writeFailedData(record: IUnifiedSearchData) {
  const directory = FAILED_DIRECTORY;

  await fs.promises.mkdir(directory, { recursive: true });

  await fs.promises.writeFile(
    path.join(directory, record.ITEM_SEQ + ".json"),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}

/** 검색 실패 JSON 파일 목록 조회 */
export async function listFailedDataFiles(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(FAILED_DIRECTORY, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(FAILED_DIRECTORY, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

/** 검색 실패 레코드 읽기 */
export async function readFailedData(
  filePath: string,
): Promise<IUnifiedSearchData> {
  return JSON.parse(await fs.promises.readFile(filePath, "utf8"));
}

/** 처리 완료한 검색 실패 파일 제거 */
export async function removeFailedData(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath);
}
