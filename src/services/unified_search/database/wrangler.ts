import cp from "node:child_process";
import path from "node:path";

import { RESOURCE_DIRECTORY } from "../../../utils/paths";

/**
 * Wrangler 쿼리 실행
 */
export function runQuery(query: string, dbName: string) {
  const safeQuery = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const command = `wrangler d1 execute ${dbName} --remote --command "${safeQuery}"`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * 쿼리 실행 결과 반환
 */
export function runQueryWithOutput(
  query: string,
  dbName: string,
  jsonOutput = false,
) {
  const safeQuery = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const command = `wrangler d1 execute ${dbName} --remote --command "${safeQuery}"`;

  const outputFlag = jsonOutput ? " --json" : "";
  const outputCommand = command + outputFlag;

  return cp.execSync(outputCommand, {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * SQL 파일 실행
 */
export function runQueryForSqlFile(resourceFileName: string, dbName: string) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);
  const command = `wrangler d1 execute ${dbName} --remote --file=${filePath} --yes`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}
