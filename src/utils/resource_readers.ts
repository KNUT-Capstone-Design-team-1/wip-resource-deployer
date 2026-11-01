import fs from "node:fs";

import * as XLSX from "xlsx";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

/**
 * 시트 범위 보정
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
 * 시트 행 추출
 */
function readWorksheet(worksheet: XLSX.WorkSheet) {
  updateWorksheetRange(worksheet);

  return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
}

/**
 * 전체 Excel 시트 로드
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
 * CSV 디코딩·로드
 */
export async function readCsvContents(fileName: string) {
  const buffer = fs.readFileSync(fileName);
  const csvString = decodeCsvBuffer(buffer);
  const fileContents = (await new Converter().fromString(csvString)) as any[];

  return fileContents;
}

/**
 * CSV 문자 인코딩 변환
 */
export function decodeCsvBuffer(buffer: Buffer) {
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
 * PDF 페이지 텍스트 추출
 */
async function readPdfPageText(page: PDFPageProxy): Promise<string> {
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
 * 전체 PDF 텍스트 수집
 */
async function readPdfPages(pdf: PDFDocumentProxy): Promise<string[]> {
  const pagesText: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const text = await readPdfPageText(page);

    pagesText.push(text);
  }

  return pagesText;
}

/**
 * PDF 로드·메모리 해제
 */
export async function readPdfContents(filePath: string) {
  const data = new Uint8Array(await fs.promises.readFile(filePath));

  // CommonJS 컴파일 시 ESM import 유지
  const pdfjsLib = await eval('import("pdfjs-dist/legacy/build/pdf.mjs")');
  const task = pdfjsLib.getDocument({ data });

  try {
    const pdf: PDFDocumentProxy = await task.promise;

    return await readPdfPages(pdf);
  } finally {
    await task.destroy();
  }
}
