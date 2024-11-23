import "dotenv/config";
import fs from "fs";
import {
  createInitialResourceFile,
  CloudFlareDownloadService,
  CloudFlareR2Client,
  createUpdateResourceFile,
  CloudflareUploadService,
} from "./services";
import { CURRENT_INITIAL_REALM_FILE_NAME, logger, NEW_INITIAL_REALM_FILE_NAME } from "./utils";

async function main() {
  logger.info("------Create initial resource file------");
  await createInitialResourceFile();

  logger.info("------Upload resource file------");
  const resourceUploadService = new CloudflareUploadService();
  await resourceUploadService.upload(NEW_INITIAL_REALM_FILE_NAME);

  logger.info("------Download current resource file------");
  CloudFlareR2Client.initS3Client();
  const resourceDownloadService = new CloudFlareDownloadService();
  await resourceDownloadService.downloadAllResources();

  logger.info("------Create update resource file------");
  await createUpdateResourceFile();

  if (fs.existsSync(CURRENT_INITIAL_REALM_FILE_NAME)) {
    logger.info("------Upload update resource file------");
    await resourceUploadService.upload(CURRENT_INITIAL_REALM_FILE_NAME);
  }

  logger.info("------End wip-resource-deployer------");
}

main();
