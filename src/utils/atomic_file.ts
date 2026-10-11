import fs from "fs";
import path from "path";

/**
 * 임시 파일을 완전히 쓴 뒤 교체하여 중단 시에도 기존 파일을 보존한다.
 */
export async function writeAtomicFile(filePath: string, contents: string) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const temporaryPath =
    filePath +
    "." +
    Date.now() +
    "." +
    Math.random().toString(16).slice(2) +
    ".tmp";

  try {
    await fs.promises.writeFile(temporaryPath, contents, "utf8");
    await fs.promises.rename(temporaryPath, filePath);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}
