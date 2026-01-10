import puppeteer from "puppeteer";
import { IMarkImageData } from "../types";

/**
 * 마크 이미지 크롤러
 */
export class MarkImageCrawler {
  public static async crawling(
    targetURL: string
  ): Promise<Array<IMarkImageData>> {
    const browser = await puppeteer.launch({
      headless: true, // 브라우저 표시 안함
    });

    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: "load" });

    const imageDatas = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll("input[name='markType']")
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
