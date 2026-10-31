import { ResourceLoader } from "../../utils/resource_loader";
import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";

/**
 * 대마 원본으로 cannabis.json 리소스를 생성
 */
export async function createCannabisResource() {
  // 대마 원본 파일을 읽고 리소스 속성으로 변환
  logger.info("[cannabis] Start load resource");

  const resources = await new ResourceLoader(["cannabis"]).loadResource();

  // 변환한 대마 데이터를 JSON 리소스 파일로 저장
  await createResourceFile("cannabis.json", resources.cannabis);

  logger.info("[cannabis] Complete create resource");
}
