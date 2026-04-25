import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 향정신성 리소스 생성
 */
export async function createpsychotropicsResource() {
  try {
    logger.info("[PSYCHOTORIPICS] Start load resource");

    const resourceLoader = new ResourceLoader(["psychotropics"]);

    const psychotropicsData = await resourceLoader.loadResource();

    logger.info("[PSYCHOTORIPICS] Complete load resource");

    logger.info("[PSYCHOTORIPICS] Start create psychotropics data");

    await createResourceFile("psychotropics.json", psychotropicsData.psychotropics, false);

    logger.info("[PSYCHOTORIPICS] Complete create psychotropics data");
  } catch (e) {
    logger.error("[PSYCHOTORIPICS] Failed to create psychotropics data. %s", e.stack || e);
  }
}
