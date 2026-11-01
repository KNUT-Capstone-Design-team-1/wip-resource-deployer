import fs from "node:fs";
import path from "node:path";

import { RESOURCE_DIRECTORY } from "./paths";
import { writeAtomicFile } from "./atomic_file";
import { describeError } from "./error_details";
import logger from "./logger";

/**
 * 출력 디렉터리 생성
 */
export function createResourcesDirectory() {
  logger.info(
    "[RESOURCE-FILE] Preparing directory path=%s",
    RESOURCE_DIRECTORY,
  );
  fs.mkdirSync(RESOURCE_DIRECTORY, { recursive: true });
}

/**
 * JSON 리소스 저장
 */
export async function createResourceFile(
  resourceFileName: string,
  resourceData: Record<string, any>[],
) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);
  const startedAt = Date.now();

  logger.info(
    "[RESOURCE-FILE] Save started path=%s records=%s",
    filePath,
    resourceData.length,
  );

  try {
    const contents = JSON.stringify({ resources: resourceData }, null, 2);
    const bytes = Buffer.byteLength(contents, "utf8");

    logger.info(
      "[RESOURCE-FILE] JSON prepared path=%s bytes=%s durationMs=%s",
      filePath,
      bytes,
      Date.now() - startedAt,
    );

    await writeAtomicFile(filePath, contents);

    logger.info(
      "[RESOURCE-FILE] Save completed path=%s records=%s bytes=%s durationMs=%s",
      filePath,
      resourceData.length,
      bytes,
      Date.now() - startedAt,
    );
  } catch (error) {
    logger.error(
      "[RESOURCE-FILE] Save failed path=%s records=%s durationMs=%s reason=%s",
      filePath,
      resourceData.length,
      Date.now() - startedAt,
      describeError(error),
    );

    throw error;
  }
}
