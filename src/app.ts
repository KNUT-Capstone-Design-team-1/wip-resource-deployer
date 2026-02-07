import config from "../config.json";
import {
  NearbyPharmaciesService,
  PillDataService,
  MarkImageService,
} from "./services";

async function main() {
  const { targetResource } = config.common;

  if (targetResource.includes("pill_data")) {
    await PillDataService.generatePillDataResourceFile();
  }

  if (targetResource.includes("nearby_pharmacies")) {
    await NearbyPharmaciesService.deployNearbyPharmaciesResource();
  }

  if (targetResource.includes("mark_images")) {
    await MarkImageService.createMarkImageResource();
  }

  process.exit(0);
}

main();
