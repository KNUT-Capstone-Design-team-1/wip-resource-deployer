import { IDrugRecognition, IMarkImageData } from "../types";
import { createResourceFile, logger, ResourceLoader } from "../utils";

/**
 * 마크 이미지 데이터 생성
 * @param drugRecognition 의약품 낱알식별정보 데이터
 * @returns
 */
export function createMarkImageData(
  drugRecognition: Array<IDrugRecognition>,
): Array<IMarkImageData> {
  const markImageMap = new Map<string, IMarkImageData>();

  for (const item of drugRecognition) {
    const hasFrontMark = Boolean(
      item.DRUG_SHAPE_FRONT ||
        item.MARK_IMAGE_FRONT ||
        item.MARK_CODE_FRONT,
    );
    const hasBackMark = Boolean(
      item.DRUG_SHAPE_BACK ||
        item.MARK_IMAGE_BACK ||
        item.MARK_CODE_BACK,
    );

    if (hasFrontMark && !markImageMap.has(item.MARK_CODE_FRONT)) {
      markImageMap.set(item.MARK_CODE_FRONT, {
        title: item.DRUG_SHAPE_FRONT,
        code: item.MARK_CODE_FRONT,
        base64: item.MARK_IMAGE_FRONT,
      });
    }

    if (hasBackMark && !markImageMap.has(item.MARK_CODE_BACK)) {
      markImageMap.set(item.MARK_CODE_BACK, {
        title: item.DRUG_SHAPE_BACK,
        code: item.MARK_CODE_BACK,
        base64: item.MARK_IMAGE_BACK,
      });
    }
  }

  return Array.from(markImageMap.values());
}

/**
 * 마크 이미지 리소스 파일 생성
 */
export async function createMarkImageResource() {
  try {
    logger.info("[MARK-IMAGE] Start load resource");

    const resourceLoader = new ResourceLoader(["drug_recognition"]);

    const resource = await resourceLoader.loadResource();

    logger.info("[MARK-IMAGE] Complete load resource");

    logger.info("[MARK-IMAGE] Start create mark image data");

    const markImageData = createMarkImageData(resource.drugRecognition);

    logger.info("[MARK-IMAGE] Complete create mark image data");

    logger.info("[MARK-IMAGE] Start create mark image resource file");

    await createResourceFile("mark_images.json", markImageData, false);

    logger.info("[MARK-IMAGE] Complete create mark image resource file");
  } catch (e) {
    logger.error(
      "[MARK-IMAGE] Failed to create mark image resource file. %s",
      e.stack || e,
    );
  }
}
