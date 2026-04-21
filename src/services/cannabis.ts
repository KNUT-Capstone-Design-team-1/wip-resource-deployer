import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 대마 리소스 생성
 */
export async function createCannabisResource() {
  try {
    logger.info("[CANNABIS] Start load resource");

    const resourceLoader = new ResourceLoader(["cannabis"]);

    const cannabisData = await resourceLoader.loadResource();

    logger.info("[CANNABIS] Complete load resource");

    logger.info("[CANNABIS] Start deploy cannabis data");

    await createResourceFile("cannabis.json", cannabisData.cannabis, false);

    logger.info("[CANNABIS] Complete deploy cannabis data");
  } catch (e) {
    logger.error("[CANNABIS] Failed to deploy cannabis data. %s", e.stack || e);
  }
}
