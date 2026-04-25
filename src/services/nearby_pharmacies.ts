import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 주변 약국 리소스 생성
 */
export async function createNearbyPharmaciesResource() {
  try {
    logger.info("[NEARBY-PHARMACIES] Start load resource");

    const resourceLoader = new ResourceLoader(["nearby_pharmacies"]);

    const nearbyPharmaciesData = await resourceLoader.loadResource();

    logger.info("[NEARBY-PHARMACIES] Complete load resource");

    logger.info("[NEARBY-PHARMACIES] Start create nearby pharmacies data");

    await createResourceFile(
      "nearby_pharmacies.json",
      nearbyPharmaciesData.nearbyPharmacies,
      false,
    );

    logger.info("[NEARBY-PHARMACIES] Complete create nearby pharmacies data");
  } catch (e) {
    logger.error(
      "[NEARBY-PHARMACIES] Failed to create nearby pharmacies data. %s",
      e.stack || e,
    );
  }
}
