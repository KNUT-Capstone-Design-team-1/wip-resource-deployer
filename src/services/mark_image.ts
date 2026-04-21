import puppeteer from "puppeteer";
import { IMarkImageData } from "../types";
import { createResourceFile, logger } from "../utils";
import config from "../../config.json";

/**
 * 마크 이미지 크롤러
 */
export class MarkImageCrawler {
  public static async crawling(
    targetURL: string,
  ): Promise<Array<IMarkImageData>> {
    const browser = await puppeteer.launch({
      headless: true, // 브라우저 표시 안함
    });

    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: "load" });

    const imageDatas = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll("input[name='markType']"),
      );

      return rows.map((inputElement) => {
        const base64Match = inputElement
          .getAttribute("onclick")
          ?.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);

        return {
          title: (inputElement as HTMLInputElement).title,
          code: (inputElement as HTMLInputElement).value,
          base64: base64Match?.[0] as string,
        };
      });
    });

    browser.close();

    return imageDatas;
  }
}

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
export async function createMarkImageResource() {
  try {
    logger.info("[MARK-IMAGE] Start crawling mark image data");

    const markImageData = await getImageDatas();

    logger.info("[MARK-IMAGE] Complete crawling mark image data");

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
