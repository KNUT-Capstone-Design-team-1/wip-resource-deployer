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

async function updateRealmDB() {
  logger.info("------Create initial resource file------");
  await createInitialResourceFile();

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

  logger.info("------End update realm from wip-resource-deployer------");
}

async function updateD1DB() {
  logger.info("------Create sql file------");

  if (process.env.MODE === "prod") {
    logger.info("------Update D1 DB------");
  }

  logger.info("------End update D1 from wip-resource-deployer------");
}

async function main() {
  const mode = process.argv[2];

  switch (mode) {
    case "realm":
      await updateRealmDB();
      break;

    case "d1":
      await updateD1DB();
      break;

    default:
      await updateRealmDB();
      await updateD1DB();
  }

  process.exit(0);
}

main();
