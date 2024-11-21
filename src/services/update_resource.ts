import { logger, UPDATE_REALM_FILE_NAME } from "../utils";
import RealmDatabase from "./realm_database";

export async function createUpdateResourceFile() {
  logger.info("Create update resource file");

  logger.info("Initial database");

  await RealmDatabase.initInstance(UPDATE_REALM_FILE_NAME);
}
