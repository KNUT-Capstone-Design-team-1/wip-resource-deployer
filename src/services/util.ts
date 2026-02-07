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
 * 원천 데이터를 저장할 디렉터리 생성
 */
export function createResourcesDirectory() {
  const dirPath = path.resolve(__dirname, "../../resources");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 원천 데이터 파일 생성
 * @param resourceFileName 파일명
 * @param resourceData 원천 데이터
 */
export function createResourceFile(
  resourceFileName: string,
  resourceData: Record<string, any>[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(
      __dirname,
      `../../resources/${resourceFileName}`,
    );

    createResourcesDirectory();

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    stream.on("finish", resolve);
    stream.on("error", reject);

    stream.write('{"resources":[');

    resourceData.forEach((resource, index) => {
      if (index > 0) stream.write(",");
      stream.write(JSON.stringify(resource));
    });

    stream.write("]}");
    stream.end();
  });
}
