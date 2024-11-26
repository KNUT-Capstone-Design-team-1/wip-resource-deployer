import "dotenv/config";
import {
  createInitialResourceFile,
  CloudFlareDownloadService,
  CloudFlareR2Client,
  createUpdateResourceFile,
  CloudflareUploadService,
} from "./services";
import { logger } from "./utils";

async function main() {
  logger.info("------Create initial resource file------");
  await createInitialResourceFile();

  logger.info("------Download current resource file------");
  CloudFlareR2Client.initS3Client();
  const resourceDownloadService = new CloudFlareDownloadService();
  await resourceDownloadService.downloadAllResources();

  logger.info("------Create update resource file------");
  await createUpdateResourceFile();

  logger.info("------Upload resource file------");
  const resourceUploadService = new CloudflareUploadService();
  await resourceUploadService.uploadAllResources();

  logger.info("------End wip-resource-deployer------");
}

main();
