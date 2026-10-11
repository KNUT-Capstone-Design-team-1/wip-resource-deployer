import { ResourceLoader } from "../../utils/resource_loader";
import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";

/**
 * 마약류 원본으로 narcotics.json 리소스를 생성한다.
 */
export async function createNarcoticsResource() {
  // 마약류 원본 파일을 읽고 리소스 속성으로 변환한다.
  logger.info("[narcotics] Start load resource");

  const resources = await new ResourceLoader(["narcotics"]).loadResource();

  // 변환한 마약류 데이터를 JSON 리소스 파일로 저장한다.
  await createResourceFile("narcotics.json", resources.narcotics);

  logger.info("[narcotics] Complete create resource");
}
