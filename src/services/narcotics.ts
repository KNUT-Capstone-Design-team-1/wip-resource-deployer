import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 마약 리소스 생성
 */
export async function createNarcoticsResource() {
  try {
    logger.info("[NARCOTICS] Start load resource");

    const resourceLoader = new ResourceLoader(["narcotics"]);

    const narcoticsData = await resourceLoader.loadResource();

    logger.info("[NARCOTICS] Complete load resource");

    logger.info("[NARCOTICS] Start deploy narcotics data");

    await createResourceFile("narcotics.json", narcoticsData.narcotics, false);

    logger.info("[NARCOTICS] Complete deploy narcotics data");
  } catch (e) {
    logger.error("[NARCOTICS] Failed to deploy narcotics data. %s", e.stack || e);
  }
}
