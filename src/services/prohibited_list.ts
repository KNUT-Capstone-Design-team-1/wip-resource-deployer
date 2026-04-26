import { createResourceFile, logger, ResourceLoader, translate } from "../utils";

/**
 * 도핑 금지 약물 리소스 생성
 */
export async function createProhibitedListResource() {
  try {
    logger.info("[PROHIBITED_LIST] Start load resource");

    const resourceLoader = new ResourceLoader(["prohibited_list"]);

    const prohibitedListData = await resourceLoader.loadResource();

    logger.info("[PROHIBITED_LIST] Complete load resource");

    logger.info("[PROHIBITED_LIST] Start translating substances");

    // genericKr이 없는 경우 genericEn을 기반으로 번역
    for (const item of prohibitedListData.prohibitedList) {
      if (!item.genericKr && item.genericEn) {
        logger.info(`[PROHIBITED_LIST] Translating: ${item.genericEn}`);

        item.genericKr = await translate(item.genericEn);
      }
    }

    logger.info("[PROHIBITED_LIST] Complete translating substances");

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
