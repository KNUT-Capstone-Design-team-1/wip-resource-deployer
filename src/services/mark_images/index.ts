import { IDrugRecognition } from "../pill_data/types/drug_recognition";
import { IMarkImageData } from "./types/mark_images";
import { createMarkImageData } from "./transform";
import { createResourceFile } from "../../utils/resource_writer";

/**
 * 마크 이미지 준비
 */
export function prepareMarkImages(
  drugs: IDrugRecognition[],
  enabled: boolean,
): Promise<IMarkImageData[] | undefined> {
  if (!enabled) {
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

  await createResourceFile("mark_image.json", images);
}
