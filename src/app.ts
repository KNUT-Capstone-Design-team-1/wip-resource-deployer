import config from "../config.json";
import {
  NearbyPharmaciesService,
  PillDataService,
  MarkImageService,
  UnifiedSearchService,
  UnifiedSearchInsertFailedService,
} from "./services";

async function main() {
  const { targetResource } = config.common;

  if (targetResource.includes("pill_data")) {
    await PillDataService.createPillDataResourceFile();
  }

  if (targetResource.includes("nearby_pharmacies")) {
    await NearbyPharmaciesService.createNearbyPharmaciesResource();
  }

  if (targetResource.includes("mark_images")) {
    await MarkImageService.createMarkImageResource();
  }

  if (targetResource.includes("unified_search")) {
    await UnifiedSearchService.updateUnifiedSearchDB();
  }

  if (targetResource.includes("unified_search_insert_failed")) {
    await UnifiedSearchInsertFailedService.insertFailedRetryAll();
  }

  process.exit(0);
}

main();
