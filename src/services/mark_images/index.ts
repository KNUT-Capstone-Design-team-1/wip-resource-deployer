import logger from "../../utils/logger";
import { ResourceLoader } from "../../utils/resource_loader";
import { createResourceFile } from "../../utils/resource_writer";
import { createMarkImageData } from "./transform";

/**
 * 마크 이미지 리소스 파일 생성
 */
export async function createMarkImageResource() {
  // 마크가 포함된 의약품 낱알식별 원본을 읽는다.
  logger.info("[MARK-IMAGE] Start load resource");

  const resourceLoader = new ResourceLoader(["drug_recognition"]);
  const resource = await resourceLoader.loadResource();

  logger.info("[MARK-IMAGE] Complete load resource");

  // 중복 마크를 제거하고 이미지 데이터를 변환한다.
  logger.info("[MARK-IMAGE] Start create mark image data");

  const markImageData = await createMarkImageData(resource.drugRecognition);

  logger.info("[MARK-IMAGE] Complete create mark image data");

  // 변환된 마크 이미지 목록을 JSON 리소스로 저장한다.
  logger.info("[MARK-IMAGE] Start create mark image resource file");
  await createResourceFile("mark_images.json", markImageData);
  logger.info("[MARK-IMAGE] Complete create mark image resource file");
}
