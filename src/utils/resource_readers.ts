import fs from "fs";
import * as XLSX from "xlsx";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

/**
 * 실제 셀 기준 시트 범위 재계산
 */
function updateWorksheetRange(worksheet: XLSX.WorkSheet) {
  const range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };

  for (const address of Object.keys(worksheet)) {
    const isMetadata = address.startsWith("!");

    if (isMetadata) {
      continue;
    }

    const cell = XLSX.utils.decode_cell(address);

    range.e.r = Math.max(range.e.r, cell.r);
    range.e.c = Math.max(range.e.c, cell.c);
  }

  worksheet["!ref"] = XLSX.utils.encode_range(range);
}

/**
 * 시트 범위 보정 및 행 추출
 */
function readWorksheet(worksheet: XLSX.WorkSheet) {
  updateWorksheetRange(worksheet);

  return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
}

/**
 * 전체 시트의 행 순차 병합
 */
export async function readExcelContents(fileName: string) {
  const workbook = XLSX.readFile(fileName);
  const allData: unknown[] = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = readWorksheet(workbook.Sheets[sheetName]);

    for (const row of rows) {
      allData.push(row);
    }
  }

  return allData;
}

/**
 * CSV 인코딩 처리 및 행 파싱
 */
export async function readCSVContents(fileName: string) {
  const buffer = fs.readFileSync(fileName);
  const csvString = decodeCSVBuffer(buffer);
  const fileContents = (await new Converter().fromString(csvString)) as any[];

  return fileContents;
}

/**
 * UTF-8 BOM 제거 및 EUC-KR 폴백 처리
 */
export function decodeCSVBuffer(buffer: Buffer) {
  const isUtf8Bom =
    buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;

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
 * PDF 페이지 텍스트 추출 및 메모리 해제
 */
async function readPDFPageText(page: PDFPageProxy): Promise<string> {
  try {
    const content = await page.getTextContent();
    const strings: string[] = [];

    for (const item of content.items) {
      const isTextItem = "str" in item;

      if (isTextItem) {
        strings.push(item.str);
      }
    }

    return strings.join(" ");
  } finally {
    page.cleanup();
  }
}

/**
 * PDF 페이지 순서별 텍스트 수집
 */
async function readPDFPages(pdf: PDFDocumentProxy): Promise<string[]> {
  const pagesText: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const text = await readPDFPageText(page);

    pagesText.push(text);
  }

  return pagesText;
}

/**
 * PDF 로드 및 종료 시 메모리 해제
 */
export async function readPDFContents(filePath: string) {
  const data = new Uint8Array(await fs.promises.readFile(filePath));
  // CommonJS 컴파일 시 ESM import 유지
  const pdfjsLib = await eval('import("pdfjs-dist/legacy/build/pdf.mjs")');
  const task = pdfjsLib.getDocument({ data });

  try {
    const pdf: PDFDocumentProxy = await task.promise;

    return await readPDFPages(pdf);
  } finally {
    await task.destroy();
  }
}
