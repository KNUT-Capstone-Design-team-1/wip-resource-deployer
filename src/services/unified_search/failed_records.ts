import fs from "fs";
import path from "path";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { IUnifiedSearchData } from "./types/unified_search";

/**
 * 배치 실패 복구에 필요한 레코드는 저장 오류를 호출자에게 전달한다.
 */
export async function writeFailedData(record: IUnifiedSearchData) {
  const directory = path.join(RESOURCE_DIRECTORY, "unified_search_insert_failed");

  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(
    path.join(directory, record.ITEM_SEQ + ".json"),
    JSON.stringify(record, null, 2),
    "utf8"
  );
}
