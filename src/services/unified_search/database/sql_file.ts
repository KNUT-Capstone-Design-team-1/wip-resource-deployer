import path from "node:path";
import fs from "node:fs";

import { createResourcesDirectory } from "../../../utils/resource_writer";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";

/**
 * SQL 파일 생성
 */
export function createSqlFile(resourceFileName: string, query: string) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);

  createResourcesDirectory();
  fs.writeFileSync(filePath, query);
}
