import "dotenv/config";
import {
  createInitialResourceFile,
  createUpdateResourceFile,
} from "./services/realm";
import { logger } from "./utils";
import {
  CloudFlareDownloadService,
  CloudflareUploadService,
} from "./services/cloudflare_service";
import { ResourceLoader } from "./services/resource_loader";
import {
  TLoadedResource,
  TResourceDirectoryName,
  TResourceType,
} from "./@types/resource";

async function deployRealmDB(resource: TLoadedResource) {
  logger.info("------Create initial resource file------");
  await createInitialResourceFile(resource);

  logger.info("------Download current resource file------");
  const resourceDownloadService = new CloudFlareDownloadService();
  await resourceDownloadService.downloadAllResources();

  logger.info("------Create update resource file------");
  await createUpdateResourceFile();

  if (process.env.MODE === "prod") {
    logger.info("------Upload resource file------");
    const resourceUploadService = new CloudflareUploadService();
    await resourceUploadService.uploadAllResources();
  }

  logger.info("------End deploy realm from wip-resource-deployer------");
}

async function deployD1DB(resource: TLoadedResource) {
  logger.info("------Create sql file------");

  if (process.env.MODE === "prod") {
    logger.info("------Apply update to D1 DB------");
  }

  logger.info("------End deploy D1 from wip-resource-deployer------");
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

  logger.info("Resource Type = %s", resourceType || "all");

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
