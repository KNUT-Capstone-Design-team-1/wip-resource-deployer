import path from "path";
import fs from "fs";
import ollama from "ollama";
import * as XLSX from "xlsx";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import { TLoadedResource, TResourceDirectoryName, TResource } from "../types";
import {
  RESOURCE_PROPERTY_MAP,
  PDF_RESOURCE_CONFIG,
  IPDFProcessorConfig,
} from "./shared";
import config from "../../config.json";
import logger from "./logger";

type TTargetResources = Array<TResourceDirectoryName>;

/**
 * 리소스 파일 로더
 */
export class ResourceLoader {
  private readonly dirPath: string;
  private readonly targetResources: TTargetResources;

  constructor(targetResources: TTargetResources) {
    this.dirPath = path.join(__dirname, `../../origin_data`);
    this.targetResources = targetResources;
  }

  /**
   * 리소스 파일을 JSON Object로 로드
   * @returns
   */
  public async loadResource<T extends TLoadedResource>(): Promise<T> {
    const resource = {} as T;

    // 초기값 세팅
    for (const dirName of Object.keys(
      RESOURCE_PROPERTY_MAP,
    ) as TResourceDirectoryName[]) {
      const key = this.snakeToCamel(dirName) as keyof T;
      resource[key] = [] as any;
    }

    for await (const resourcePath of this.getPathList()) {
      const fileList = fs.existsSync(resourcePath)
        ? fs.readdirSync(resourcePath).filter((file) => !file.startsWith(".")) // (.)숨김파일 제외
        : [];

      if (fileList.length === 0) {
        continue;
      }

      const resourceData = await this.getResources(resourcePath, fileList);
      const dirName = resourcePath
        .split(/\\|\//)
        .pop() as TResourceDirectoryName;
      const key = this.snakeToCamel(dirName) as keyof T;

      resource[key] = resourceData as any;
    }

    return resource;
  }

  /**
   * 리소스 파일 경로 반환
   * @returns
   */
  private getPathList(): Array<string> {
    return this.targetResources.map((dirName) =>
      path.join(`${this.dirPath}/${dirName}`),
    );
  }

  /**
   * 리소스 파일로 부터 리소스를 로드
   * @param resourcePath 리소스 파일 경로
   * @param fileList 파일 목록
   * @returns
   */
  private async getResources(
    resourcePath: string,
    fileList: string[],
  ): Promise<Array<TResource>> {
    const resourceData: Array<TResource> = [];

    for await (const fileName of fileList) {
      const fileContents = await this.readFileContents(
        `${resourcePath}/${fileName}`,
      );

      if (fileContents.length === 0) {
        continue;
      }

      resourceData.push(...fileContents);
    }

    return resourceData;
  }

  /**
   * 리소스 파일의 내용을 읽고 반환
   * @param fileName 파일 이름
   * @returns
   */
  private async readFileContents(fileName: string): Promise<Array<TResource>> {
    const fileExtension = fileName.split(".").slice(-1)[0];

    const dirName = fileName
      .split(/\\|\//)
      .slice(-2)[0] as TResourceDirectoryName;

    switch (fileExtension) {
      case "xlsx":
      case "xls":
        return this.mappingProperty(
          await this.readExcelContents(fileName),
          RESOURCE_PROPERTY_MAP[dirName],
        );

      case "csv":
        return this.mappingProperty(
          await this.readCSVContents(fileName),
          RESOURCE_PROPERTY_MAP[dirName],
        );

      case "pdf":
        const config = PDF_RESOURCE_CONFIG[dirName];

        if (!config) {
          throw new Error(`No PDF configuration for ${dirName}`);
        }

        return await this.processPDFWithLLM(fileName, config);

      default:
        throw new Error(`Invalid file extension ${fileExtension}`);
    }
  }

  /**
   * 엑셀 파일 로드
   * @param fileName 파일 이름
   * @returns
   */
  private async readExcelContents(fileName: string) {
    const workbook = XLSX.readFile(fileName);
    const allData: any[] = [];

    // 모든 시트의 데이터를 합침
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];

      // !ref가 실제 데이터보다 작게 잡혀있는 경우를 대비해 범위 재계산
      const range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
      Object.keys(worksheet).forEach((cell) => {
        if (cell[0] === "!") {
          return;
        }

        const decoded = XLSX.utils.decode_cell(cell);

        if (range.e.r < decoded.r) {
          range.e.r = decoded.r;
        }

        if (range.e.c < decoded.c) {
          range.e.c = decoded.c;
        }
      });

      worksheet["!ref"] = XLSX.utils.encode_range(range);

      // 첫 줄을 헤더로 인식하여 JSON 배열로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      allData.push(...jsonData);
    });

    return allData;
  }

  /**
   * CSV 파일 로드
   * @param fileName 파일 이름
   * @returns
   */
  private async readCSVContents(fileName: string) {
    const csvString = iconvLite.decode(fs.readFileSync(fileName), "euc-kr");
    const fileContents = (await new Converter().fromString(csvString)) as any[];

    return fileContents;
  }

  /**
   * PDF 파일을 읽고 LLM을 통해 구조화된 데이터로 변환
   * @param filePath 파일 경로
   * @param config 프로세서 설정
   * @returns
   */
  private async processPDFWithLLM<T>(
    filePath: string,
    config: IPDFProcessorConfig<T>,
  ): Promise<T[]> {
    const pages = await this.extractText(filePath);
    const results: T[] = [];

    let currentCategory: string | undefined;

    for (let i = 0; i < pages.length; i++) {
      const pageText = pages[i];

      logger.info(
        `[PDF] Processing page ${i + 1}/${pages.length} (${pageText.length} chars)`,
      );

      if (!config.sectionRegex) {
        const pageResults = await this.executeLLMClassify(config, pageText);

        results.push(...pageResults);

        continue;
      }

      const matches = [...pageText.matchAll(config.sectionRegex)];

      if (matches.length === 0) {
        // 섹션 구분자가 없는 페이지는 현재 유지 중인 카테고리로 처리
        const pageResults = await this.executeLLMClassify(
          config,
          pageText,
          currentCategory,
        );

        results.push(...pageResults);

        continue;
      }

      for (let j = 0; j < matches.length; j++) {
        // 첫 번째 매치 이전의 텍스트가 있다면 이전 카테고리로 처리
        if (j === 0 && matches[j].index! > 0) {
          const beforeContent = pageText.slice(0, matches[j].index);

          const beforeResults = await this.executeLLMClassify(
            config,
            beforeContent,
            currentCategory,
          );

          results.push(...beforeResults);
        }

        currentCategory = matches[j][0];
        const start = matches[j].index!;
        const end = matches[j + 1]?.index ?? pageText.length;

        const content = pageText.slice(start, end);

        results.push(
          ...(await this.executeLLMClassify(config, content, currentCategory)),
        );
      }
    }

    return results;
  }

  /**
   * PDF 파일로 부터 텍스트 추출 (페이지별)
   * @param filePath 파일 경로
   * @returns 페이지별 텍스트 배열
   */
  private async extractText(filePath: string): Promise<string[]> {
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

  /**
   * LLM을 실행하여 PDF 내용 분류 및 구조화
   * @param config PDF 프로세서 설정
   * @param text PDF 텍스트 내용
   * @param category 카테고리
   * @returns 분류된 데이터 배열
   */
  private async executeLLMClassify<T>(
    config: IPDFProcessorConfig<T>,
    text: string,
    category?: string,
  ): Promise<T[]> {
    const prompt = config.promptGenerator(text, category);
    const items = (await this.classifyWithLLM(prompt)) as any[];

    const results: T[] = [];

    if (config.postProcessor) {
      results.push(...config.postProcessor(items, category));
    } else {
      results.push(...items);
    }

    return results;
  }

  /**
   * OLLAMA를 통해 LLM을 실행하여 PDF 파일로 부터 내용 추출
   * @param prompt 프롬프트
   * @returns
   */
  private async classifyWithLLM(prompt: string) {
    const { model } = config.ollama;

    try {
      const response = await ollama.generate({
        model,
        prompt,
        format: "json",
        stream: false,
      });

      const text = response.response.trim();

      logger.info("LLM Response: %s", text);

      return JSON.parse(text);
    } catch (error) {
      logger.error("Ollama execution failed: %s", error);
      return [];
    }
  }

  /**
   * 리소스 파일의 프로퍼티를 매핑
   * @param fileContents 라소스 파일 내용
   * @param propertyMap 매핑할 프로퍼티 맵
   * @returns
   */
  private mappingProperty(
    fileContents: Array<any>,
    propertyMap: Record<string, string>,
  ): Array<TResource> {
    const mappedResources: Array<TResource> = [];

    // propertyMap의 key에서 공백 및 줄바꿈 제거한 정규화된 맵 생성
    const normalizedPropertyMap: Record<string, string> = {};
    Object.entries(propertyMap).forEach(([from, to]) => {
      normalizedPropertyMap[from.replace(/\s/g, "")] = to;
    });

    fileContents.forEach((resourceData) => {
      const resource: Record<string, any> = {};

      // 각 행 데이터의 key에서도 공백 및 줄바꿈을 제거하여 매핑
      Object.entries(resourceData).forEach(([key, value]) => {
        const normalizedKey = key.replace(/\s/g, "");
        const targetProperty = normalizedPropertyMap[normalizedKey];

        if (targetProperty) {
          resource[targetProperty] = value;
        }
      });

      // 매핑된 결과가 비어있지 않은 경우에만 추가
      if (Object.keys(resource).length > 0) {
        mappedResources.push(resource as TResource);
      }
    });

    return mappedResources;
  }

  /**
   * snake_case를 camelCase로 변환
   * @param str 대상 문자열
   * @returns
   */
  private snakeToCamel(str: string): string {
    return str.replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace("-", "").replace("_", ""),
    );
  }
}
