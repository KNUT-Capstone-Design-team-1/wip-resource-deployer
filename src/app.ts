import config from "../config.json";
import {
  NearbyPharmaciesService,
  PillDataService,
  MarkImageService,
  UnifiedSearchService,
  UnifiedSearchInsertFailedService,
  CannabisService,
  NarcoticsService,
  PsychotropicsService,
  ProhibitedListService,
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
    await UnifiedSearchService.updateUnifiedSearchDB(config.unifiedSearch?.dbInitialize);
  }

  if (targetResource.includes("unified_search_insert_failed")) {
    await UnifiedSearchInsertFailedService.upsertFailedRetryAll();
  }

  if (targetResource.includes("cannabis")) {
    await CannabisService.createCannabisResource();
  }

  if (targetResource.includes("narcotics")) {
    await NarcoticsService.createNarcoticsResource();
  }

  if (targetResource.includes("psychotropics")) {
    await PsychotropicsService.createpsychotropicsResource();
  }

  if (targetResource.includes("prohibited_list")) {
    await ProhibitedListService.createProhibitedListResource();
  }

  process.exit(0);
}

main();
