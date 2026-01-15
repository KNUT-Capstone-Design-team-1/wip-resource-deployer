import path from "path";
import fs from "fs";
import { IMarkImageData } from "../types";
import { logger, MarkImageCrawler } from "../utils";
import config from "../../config.json";

/**
 * 마크 이미지 크롤링 요청
 * @returns
 */
async function getImageDatas() {
  const { targetURL, totalPages, limit } = config.markImage;

  const imageDatas: Array<IMarkImageData> = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const url = `${targetURL}?totalPages=${totalPages}&page=${page}&limit=${limit}&sort=&sortOrder=&search=`;

    imageDatas.push(...(await MarkImageCrawler.crawling(url)));
  }

  return imageDatas;
}

/**
 * 마크 이미지 리소스 파일 생성
 */
function createMarkImageResourceFile(imageDatas: Array<IMarkImageData>) {
  const filePath = path.resolve(__dirname, "../../mark_image_data.json");

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(imageDatas, null, 2));
}

/**
 * 마크 이미지 리소스 파일 생성
 */
export async function createMarkImageResource() {
  try {
    logger.info("[MARK-IMAGE] Start crawling mark image data");

    const imageDatas = await getImageDatas();

    logger.info("[MARK-IMAGE] Complete crawling mark image data");

    logger.info("[MARK-IMAGE] Start create mark image resource file");

    createMarkImageResourceFile(imageDatas);

    logger.info("[MARK-IMAGE] Complete create mark image resource file");
  } catch (e) {
    logger.error("[MARK-IMAGE] Failed to create mark image resource file. %s", e.stack || e);
  }
}
