import "dotenv/config";
import * as RealmService from "./services/realm";
import * as CloudflareService from "./services/cloudflare_service";
import * as D1Service from "./services/d1";
import { ResourceLoader } from "./services/resource_loader";
import { logger } from "./utils";
import {
  TLoadedResource,
  TResourceDirectoryName,
  TResourceType,
} from "./@types/resource";

async function deployRealmDB(resource: TLoadedResource) {
  logger.info("------[REALM] Create initial resource file------");
  await RealmService.createInitialResourceFile(resource);

  logger.info("------[REALM] Download current resource file------");
  const resourceDownloadService =
    new CloudflareService.CloudFlareDownloadService();
  await resourceDownloadService.downloadAllResources();

  logger.info("------[REALM] Create update resource file------");
  await RealmService.createUpdateResourceFile();

  if (process.env.MODE === "prod") {
    logger.info("------[REALM] Upload resource file------");
    const resourceUploadService =
      new CloudflareService.CloudflareUploadService();
    await resourceUploadService.uploadAllResources();
  }

  logger.info(
    "------[REALM] End deploy realm from wip-resource-deployer------"
  );
}

async function deployD1DB(resource: TLoadedResource) {
  if (process.env.MODE !== "prod") {
    logger.info("------[D1] D1 resource is only execute prod mode------");
    return;
  }

  logger.info("------[D1] Upsert database------");

  D1Service.updateNearbyPharmacies(resource);

  logger.info("------[D1] End deploy D1 from wip-resource-deployer------");
}

async function loadResource(resourceType: TResourceType) {
  const targetResources: Array<TResourceDirectoryName> = [];

  switch (resourceType) {
    case "realm":
      targetResources.push(
        "drug_recognition",
        "finished_medicine_permission_detail"
      );
      break;

    case "d1":
      targetResources.push("nearby_pharmacies");
      break;

    default:
      targetResources.push(
        "drug_recognition",
        "finished_medicine_permission_detail",
        "nearby_pharmacies"
      );
  }

  logger.info("Start load resource");

  const resourceLoader = new ResourceLoader(targetResources);
  const resource = await resourceLoader.loadResource();

  logger.info("Complete load resource");

  return resource;
}

async function main() {
  const resourceType = process.argv[2] as TResourceType;

  const resource = await loadResource(resourceType);

  switch (resourceType) {
    case "realm":
      await deployRealmDB(resource);
      break;

    case "d1":
      await deployD1DB(resource);
      break;

    default:
      await deployRealmDB(resource);
      await deployD1DB(resource);
  }

  process.exit(0);
}

main();
