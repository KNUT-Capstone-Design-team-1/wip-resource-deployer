import "dotenv/config";
import {
  createInitialResourceFile,
  CloudFlareDownloadService,
  CloudFlareR2Client,
  createUpdateResourceFile,
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
  logger.info("------Upload update resource file------");

  // 4. current와 new를 비교해서 값이 다른 데이터를 update.realm으로 만든다
  // 5. initial.realm과 update.realm을 CF에 업로드 하여 덮어쓰기 한다

  logger.info("------End wip-resource-deployer------");
}

main();
