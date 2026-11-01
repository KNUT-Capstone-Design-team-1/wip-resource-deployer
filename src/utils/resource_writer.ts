import fs from "node:fs";
import path from "node:path";

import { RESOURCE_DIRECTORY } from "./paths";
import { writeAtomicFile } from "./atomic_file";

/**
 * 출력 디렉터리 생성
 */
export function createResourcesDirectory() {
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

  await writeAtomicFile(
    filePath,
    JSON.stringify({ resources: resourceData }, null, 2),
  );
}
