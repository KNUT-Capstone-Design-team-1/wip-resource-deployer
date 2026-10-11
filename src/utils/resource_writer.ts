import fs from "fs";
import path from "path";
import { RESOURCE_DIRECTORY } from "./paths";
import { writeAtomicFile } from "./atomic_file";

/**
 * 출력 리소스 디렉터리가 없으면 상위 경로와 함께 생성한다.
 */
export function createResourcesDirectory() {
  fs.mkdirSync(RESOURCE_DIRECTORY, { recursive: true });
}

/**
 * 생성한 데이터를 JSON 리소스로 저장하고 완료된 파일로 교체한다.
 */
export async function createResourceFile(resourceFileName: string, resourceData: Record<string, any>[]) {
  const filePath = path.join(RESOURCE_DIRECTORY, resourceFileName);

  await writeAtomicFile(filePath, JSON.stringify({ resources: resourceData }, null, 2));
}
