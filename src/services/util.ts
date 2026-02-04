import cp from "child_process";

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
