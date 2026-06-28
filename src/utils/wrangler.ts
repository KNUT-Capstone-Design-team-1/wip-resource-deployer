import cp from "child_process";
import path from "path";
import fs from "fs";
import { createResourcesDirectory } from "./shared";
/**
 * wrangler에 쿼리 실행
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
 * wrangler에 SQL 파일 쿼리 실행
 * @param resourceFileName 파일명
 * @param dbName 대상 DB 이름
 * @returns
 */
export function runQueryForSQLFile(resourceFileName: string, dbName: string) {
  const filePath = path.resolve(
    __dirname,
    `../../resources/${resourceFileName}`,
  );

  const command = `wrangler d1 execute ${dbName} --remote --file=${filePath} --yes`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * SQL 파일 생성
 * @param resourceFileName 파일명
 * @param query 쿼리
 */
export function createSQLFile(resourceFileName: string, query: string) {
  const filePath = path.resolve(
    __dirname,
    `../../resources/${resourceFileName}`,
  );

  createResourcesDirectory();

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }

  fs.writeFileSync(filePath, query);
}

/**
 * SQL 쿼리에 안전하게 삽입할 수 있도록 값을 변환
 * @param val 변환할 값
 * @returns 
 */
export function getSafeValue(val: any) {
  if (val === undefined || val === null) {
    return "NULL";
  }

  if (typeof val === "string") {
    return `'${val.replace(/'/g, "''")}'`;
  }

  return val;
}
