import logger from "../../shared/logging/logger";
import { ResourceLoader } from "../../infrastructure/resources/loader";
import { createResourceFile } from "../../infrastructure/resources/writer";
import { createMarkImageData } from "./transform";
/**
 * 마크 이미지 리소스 파일 생성
 */
export async function createMarkImageResource() {
  logger.info("[MARK-IMAGE] Start load resource");
  const resourceLoader = new ResourceLoader(["drug_recognition"]);
  const resource = await resourceLoader.loadResource();
  logger.info("[MARK-IMAGE] Complete load resource");
  logger.info("[MARK-IMAGE] Start create mark image data");
  const markImageData = await createMarkImageData(resource.drugRecognition);
  logger.info("[MARK-IMAGE] Complete create mark image data");
  logger.info("[MARK-IMAGE] Start create mark image resource file");
  await createResourceFile("mark_images.json", markImageData, false);
  logger.info("[MARK-IMAGE] Complete create mark image resource file");
}
