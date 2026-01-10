import path from "path";
import fs from "fs";
import { IMarkImageData } from "../types";
import { MarkImageCrawler } from "../utils";
import config from "../../config.json";

/**
 * 마크 이미지 리소스 파일 생성
 */
export async function createMarkImageResource() {
  const { targetURL, totalPages, limit } = config.markImage;

  const imageDatas: Array<IMarkImageData> = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const url = `${targetURL}?totalPages=${totalPages}&page=${page}&limit=${limit}&sort=&sortOrder=&search=`;

    imageDatas.push(...(await MarkImageCrawler.crawling(url)));
  }

  const filePath = path.resolve(__dirname, "../../mark_image_data.json");

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(imageDatas, null, 2));
}