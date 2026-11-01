import { IDrugRecognition } from "../pill_data/types/drug_recognition";
import { IMarkImageData } from "./types/mark_images";
import { createMarkImageData } from "./transform";
import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";

/**
 * 마크 이미지 준비
 */
export function prepareMarkImages(
  drugs: IDrugRecognition[],
  enabled: boolean,
): Promise<IMarkImageData[] | undefined> {
  if (!enabled) {
    logger.info(
      "[MARK-IMAGE] Skipped enabled=false sourceRecords=%s; keeping existing mark_image.json",
      drugs.length,
    );

    return Promise.resolve(undefined);
  }

  return createMarkImageData(drugs);
}

/**
 * 마크 이미지 저장
 */
export async function saveMarkImages(
  images: IMarkImageData[] | undefined,
): Promise<void> {
  const isDisabled = images === undefined;
  if (isDisabled) {
    return;
  }

  const hasNoValidImages = images.length === 0;
  if (hasNoValidImages) {
    logger.warn(
      "[MARK-IMAGE] No valid images; keeping existing mark_image.json",
    );

    return;
  }

  await createResourceFile("mark_image.json", images);
}
