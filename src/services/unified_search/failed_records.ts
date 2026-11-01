import fs from "node:fs";
import path from "node:path";

import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { IUnifiedSearchData } from "./types/unified_search";

/**
 * 검색 실패 레코드 저장
 */
export async function writeFailedData(record: IUnifiedSearchData) {
  const directory = path.join(
    RESOURCE_DIRECTORY,
    "unified_search_insert_failed",
  );

  await fs.promises.mkdir(directory, { recursive: true });

  await fs.promises.writeFile(
    path.join(directory, record.ITEM_SEQ + ".json"),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}
