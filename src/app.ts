import { logger } from "./utils";
import { ResourceLoader } from "./services/resource_loader";

async function main() {
  logger.info("Start wip-resource-deployer");

  const resourceLoader = new ResourceLoader();
  const resource = await resourceLoader.loadResource();

  logger.info("End wip-resource-deployer");
}

main();
