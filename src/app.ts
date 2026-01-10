import config from "../config.json";
import { NearbyPharmaciesService, PillDataService, MarkImageService } from "./services";

async function main() {
  const { targetResource } = config.common;

  if (targetResource.includes("pillData")) {
    await PillDataService.generatePillDataResourceFile();
  }

  if (targetResource.includes("nearbyPharmacies")) {
    await NearbyPharmaciesService.deployNearbyPharmaciesResource();
  }

  if (targetResource.includes("markImage")) {
    await MarkImageService.createMarkImageResource();
  }

  process.exit(0);
}

main();
