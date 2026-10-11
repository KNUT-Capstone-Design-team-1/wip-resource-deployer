import { ResourceLoader } from "../../utils/resource_loader";
import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";

/**
 * 도핑 금지 목록 원본으로 prohibited_list.json 리소스를 생성한다.
 */
export async function createProhibitedListResource() {
  // 도핑 금지 목록 원본 파일을 읽고 리소스 속성으로 변환한다.
  logger.info("[prohibited_list] Start load resource");

  const resources = await new ResourceLoader([
    "prohibited_list",
  ]).loadResource();

  // 변환한 도핑 금지 목록 데이터를 JSON 리소스 파일로 저장한다.
  await createResourceFile("prohibited_list.json", resources.prohibitedList);

  logger.info("[prohibited_list] Complete create resource");
}
