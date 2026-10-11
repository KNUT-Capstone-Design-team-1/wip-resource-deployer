import logger from "../../utils/logger";
import { createResourceFile } from "../../utils/resource_writer";
import { fetchAllNearbyPharmacies } from "./client";

/**
 * 주변 약국 리소스 파일(nearby_pharmacies.json) 생성
 */
export async function createNearbyPharmaciesResource(apiUrl?: string) {
  // 약국 API를 페이지 단위로 조회해 전체 약국 목록을 수집한다.
  logger.info("[NEARBY-PHARMACIES] Start fetching nearby pharmacies from API");

  const nearbyPharmacies = await fetchAllNearbyPharmacies(apiUrl || undefined);

  logger.info(
    `[NEARBY-PHARMACIES] Successfully fetched ${nearbyPharmacies.length} nearby pharmacies`,
  );

  // 수집한 약국 목록을 JSON 리소스로 저장한다.
  logger.info("[NEARBY-PHARMACIES] Start create nearby pharmacies data file");
  await createResourceFile("nearby_pharmacies.json", nearbyPharmacies);
  logger.info(
    "[NEARBY-PHARMACIES] Complete create nearby pharmacies data file",
  );
}
