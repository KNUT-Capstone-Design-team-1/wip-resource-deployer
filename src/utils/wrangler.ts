import cp from "child_process";
import path from "path";
import fs from "fs";

/**
 * wrangler에 쿼리 실행
 * @param query 실행할 쿼리
 * @returns
 */
export function runQuery(query: string) {
  const safeQuery = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  const command = `wrangler d1 execute wip --remote --command "${safeQuery}"`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * wrangler에 SQL 파일 쿼리 실행
 * @param resourceFileName 파일명
 * @returns
 */
export function runQueryForSQLFile(resourceFileName: string) {
  const filePath = path.resolve(
    __dirname,
    `../../resources/${resourceFileName}`,
  );

  const command = `wrangler d1 execute wip --remote --file=${filePath} --yes`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * 원천 데이터를 저장할 디렉터리 생성
 */
function createResourcesDirectory() {
  const dirPath = path.resolve(__dirname, "../../resources");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
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
