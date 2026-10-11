import path from "path";
import fs from "fs";
import { createResourcesDirectory } from "../resources/writer";
import { RESOURCE_DIRECTORY } from "../../shared/paths";

export function createSQLFile(resourceFileName: string, query: string) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);
  createResourcesDirectory();
  fs.writeFileSync(filePath, query);
}
