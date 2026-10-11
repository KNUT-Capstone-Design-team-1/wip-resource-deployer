import fs from "fs";
import * as XLSX from "xlsx";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";

/**
 * 각 시트의 실제 셀 범위를 계산하고 모든 시트의 행을 JSON 배열로 합친다.
 */
export async function readExcelContents(fileName: string) {
  const workbook = XLSX.readFile(fileName);
  const allData: any[] = [];

  // 모든 시트의 데이터를 합침
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    // !ref가 실제 데이터보다 작게 잡혀있는 경우를 대비해 범위 재계산
    const range = {
      s: { c: 0, r: 0 },
      e: { c: 0, r: 0 },
    };

    Object.keys(worksheet)
      .filter((cell) => !cell.startsWith("!"))
      .map((cell) => XLSX.utils.decode_cell(cell))
      .forEach((cell) => {
        range.e.r = Math.max(range.e.r, cell.r);
        range.e.c = Math.max(range.e.c, cell.c);
      });
    worksheet["!ref"] = XLSX.utils.encode_range(range);

    // 첫 줄을 헤더로 인식하여 JSON 배열로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    allData.push(...jsonData);
  });

  return allData;
}

/**
 * CSV 파일의 인코딩을 처리한 뒤 헤더 기반 객체 배열로 파싱한다.
 */
export async function readCSVContents(fileName: string) {
  const buffer = fs.readFileSync(fileName);
  const csvString = decodeCSVBuffer(buffer);
  const fileContents = (await new Converter().fromString(csvString)) as any[];

  return fileContents;
}

/**
 * UTF-8 BOM을 제거하고 UTF-8 디코딩 실패 시 EUC-KR로 읽는다.
 */
export function decodeCSVBuffer(buffer: Buffer) {
  const isUtf8Bom = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;

  if (isUtf8Bom) {
    return buffer.toString("utf8").slice(1);
  }

  const utf8String = iconvLite.decode(buffer, "utf-8");
  const isValidUtf8 = !utf8String.includes("\uFFFD");

  if (isValidUtf8) {
    return utf8String;
  }

  return iconvLite.decode(buffer, "euc-kr");
}

/**
 * PDF의 각 페이지에서 텍스트를 추출해 페이지 순서대로 반환한다.
 */
export async function readPDFContents(filePath: string) {
  const data = new Uint8Array(fs.readFileSync(filePath));

  // TS가 require()로 변환하는 것을 방지하기 위해 eval 사용
  const pdfjsLib = await eval('import("pdfjs-dist/legacy/build/pdf.mjs")');
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pagesText: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);

    pagesText.push(strings.join(" ") + "\n");
  }

  return pagesText;
}
