import path from "path";
import fs from "fs";
import { createResourcesDirectory } from "../resources/writer";
import { RESOURCE_DIRECTORY } from "../../shared/paths";

/** 리소스 디렉터리를 준비하고 쿼리를 지정한 SQL 파일에 저장한다. */
export function createSQLFile(resourceFileName: string, query: string) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);
  createResourcesDirectory();
  fs.writeFileSync(filePath, query);
}
