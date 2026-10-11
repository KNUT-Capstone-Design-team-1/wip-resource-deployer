import logger from "../../shared/logging/logger";
import { createResourceFile } from "../../infrastructure/resources/writer";
import { fetchAllNearbyPharmacies } from "./client";
/**
 * 주변 약국 리소스 파일(nearby_pharmacies.json) 생성
 */
export async function createNearbyPharmaciesResource(apiUrl?: string) {
  logger.info("[NEARBY-PHARMACIES] Start fetching nearby pharmacies from API");
  const nearbyPharmacies = await fetchAllNearbyPharmacies(apiUrl || undefined);
  logger.info(`[NEARBY-PHARMACIES] Successfully fetched ${nearbyPharmacies.length} nearby pharmacies`);
  logger.info("[NEARBY-PHARMACIES] Start create nearby pharmacies data file");
  await createResourceFile("nearby_pharmacies.json", nearbyPharmacies, false);
  logger.info("[NEARBY-PHARMACIES] Complete create nearby pharmacies data file");
}
