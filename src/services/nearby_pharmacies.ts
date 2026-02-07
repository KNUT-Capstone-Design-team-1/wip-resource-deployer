import { logger, ResourceLoader } from "../utils";
import { createResourceFile, runQuery } from "./util";

/**
 * 주변 약국 리소스 배포
 */
export async function deployNearbyPharmaciesResource() {
  try {
    logger.info("[NEARBY-PHARMACIES] Start load resource");

    const resourceLoader = new ResourceLoader(["nearby_pharmacies"]);

    const nearbyPharmaciesData = await resourceLoader.loadResource();

    logger.info("[NEARBY-PHARMACIES] Complete load resource");

    logger.info("[NEARBY-PHARMACIES] Start deploy nearby pharmacies data");

    await createResourceFile(
      "nearby_pharmacies.json",
      nearbyPharmaciesData.nearbyPharmacies,
    );

    logger.info("[NEARBY-PHARMACIES] Complete deploy nearby pharmacies data");
  } catch (e) {
    logger.error(
      "[NEARBY-PHARMACIES] Failed to deploy nearby pharmacies data. %s",
      e.stack || e,
    );
  }
}
