import cp from "child_process";
import path from "path";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";

/**
 * wrangler에 쿼리 실행 (콘솔에 출력)
 * @param query 실행할 쿼리
 * @param dbName 대상 DB 이름
 * @returns
 */
export function runQuery(query: string, dbName: string) {
  const safeQuery = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const command = `wrangler d1 execute ${dbName} --remote --command "${safeQuery}"`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * wrangler에 쿼리 실행하고 stdout 문자열 반환
 * @param query 실행할 쿼리
 * @param dbName 대상 DB 이름
 * @returns
 */
export function runQueryWithOutput(query: string, dbName: string) {
  const safeQuery = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const command = `wrangler d1 execute ${dbName} --remote --command "${safeQuery}"`;

  return cp.execSync(command, { encoding: "utf8", stdio: "pipe" });
}

/**
 * wrangler에 SQL 파일 쿼리 실행
 * @param resourceFileName 파일명
 * @param dbName 대상 DB 이름
 * @returns
 */
export function runQueryForSQLFile(resourceFileName: string, dbName: string) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);
  const command = `wrangler d1 execute ${dbName} --remote --file=${filePath} --yes`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}
