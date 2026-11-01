import fs from "node:fs";
import path from "node:path";

/**
 * 임시 파일 작성·원자적 교체
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
