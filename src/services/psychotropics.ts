import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 향정신성 리소스 생성
 */
export async function createpsychotropicsResource() {
  try {
    logger.info("[psychotropics] Start load resource");

    const resourceLoader = new ResourceLoader(["psychotropics"]);

    const psychotropicsData = await resourceLoader.loadResource();

    logger.info("[psychotropics] Complete load resource");

    logger.info("[psychotropics] Start deploy psychotropics data");

    await createResourceFile("psychotropics.json", psychotropicsData.psychotropics, false);

    logger.info("[psychotropics] Complete deploy psychotropics data");
  } catch (e) {
    logger.error("[psychotropics] Failed to deploy psychotropics data. %s", e.stack || e);
  }
}
