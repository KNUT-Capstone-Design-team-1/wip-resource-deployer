import { ResourceLoader } from "../../utils/resource_loader";
import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";

/**
 * 향정신성 약물 원본으로 psychotropics.json 리소스를 생성한다.
 */
export async function createPsychotropicsResource() {
  // 향정신성 약물 원본 파일을 읽고 리소스 속성으로 변환한다.
  logger.info("[psychotropics] Start load resource");

  const resources = await new ResourceLoader(["psychotropics"]).loadResource();

  // 변환한 향정신성 약물 데이터를 JSON 리소스 파일로 저장한다.
  await createResourceFile("psychotropics.json", resources.psychotropics);

  logger.info("[psychotropics] Complete create resource");
}
