import { ResourceLoader } from "./resource_loader";
import { createResourceFile } from "./resource_writer";
import { RESOURCE_KEYS, type TResourceDirectoryName } from "./types/resources";
import logger from "./logger";

/** 파일 기반 리소스를 로드하고 같은 이름의 JSON으로 저장한다. */
export async function createSourceResource(name: TResourceDirectoryName) {
  logger.info("[" + name + "] Start load resource");
  const resources = await new ResourceLoader([name]).loadResource();
  await createResourceFile(name + ".json", resources[RESOURCE_KEYS[name]]);
  logger.info("[" + name + "] Complete create resource");
}
