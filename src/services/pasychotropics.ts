import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 향정신성 리소스 생성
 */
export async function createPasychotropicsResource() {
  try {
    logger.info("[PASYCHOTROPICS] Start load resource");

    const resourceLoader = new ResourceLoader(["pasychotropics"]);

    const pasychotropicsData = await resourceLoader.loadResource();

    logger.info("[PASYCHOTROPICS] Complete load resource");

    logger.info("[PASYCHOTROPICS] Start deploy pasychotropics data");

    await createResourceFile("pasychotropics.json", pasychotropicsData.pasychotropics, false);

    logger.info("[PASYCHOTROPICS] Complete deploy pasychotropics data");
  } catch (e) {
    logger.error("[PASYCHOTROPICS] Failed to deploy pasychotropics data. %s", e.stack || e);
  }
}
