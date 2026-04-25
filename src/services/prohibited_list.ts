import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 도핑 금지 약물 리소스 생성
 */
export async function createProhibitedListResource() {
  try {
    logger.info("[PROHIBITED_LIST] Start load resource");

    const resourceLoader = new ResourceLoader(["prohibited_list"]);

    const prohibitedListData = await resourceLoader.loadResource();

    logger.info("[PROHIBITED_LIST] Complete load resource");

    logger.info("[PROHIBITED_LIST] Start create prohibited list data");

    await createResourceFile(
      "prohibited_list.json",
      prohibitedListData.prohibitedList,
      false,
    );

    logger.info("[PROHIBITED_LIST] Complete create prohibited list data");
  } catch (e) {
    logger.error(
      "[PROHIBITED_LIST] Failed to create prohibited list data. %s",
      e.stack || e,
    );
  }
}
