import "dotenv/config";
import fs from "fs";
import {
  createInitialResourceFile,
  CloudFlareDownloadService,
  CloudFlareR2Client,
  createUpdateResourceFile,
  CloudflareUploadService,
} from "./services";
import {
  logger,
  INITIAL_REALM_FILE_NAME,
  UPDATE_REALM_FILE_NAME,
} from "./utils";

async function main() {
  logger.info("------Create initial resource file------");
  // await createInitialResourceFile();

  logger.info("------Upload resource file------");
  CloudFlareR2Client.initS3Client();
  const resourceUploadService = new CloudflareUploadService();
  await resourceUploadService.upload(INITIAL_REALM_FILE_NAME);

  logger.info("------Download current resource file------");
  const resourceDownloadService = new CloudFlareDownloadService();
  // await resourceDownloadService.downloadAllResources();

  logger.info("------Create update resource file------");
  await createUpdateResourceFile();

  if (fs.existsSync(UPDATE_REALM_FILE_NAME)) {
    logger.info("------Upload update resource file------");
    await resourceUploadService.upload(UPDATE_REALM_FILE_NAME);
  }

  logger.info("------End wip-resource-deployer------");
}

main();
