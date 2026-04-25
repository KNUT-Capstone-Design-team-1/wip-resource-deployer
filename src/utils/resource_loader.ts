import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import { TLoadedResource, TResourceDirectoryName, TResource } from "../types";
import { RESOURCE_PROPERTY_MAP } from "../utils";

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
      case "xls": {
        // 엑셀 파일 읽기
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

        return this.mappingProperty(allData, RESOURCE_PROPERTY_MAP[dirName]);
      }

      case "csv": {
        const csvString = iconvLite.decode(fs.readFileSync(fileName), "euc-kr");
        const fileContents = (await new Converter().fromString(
          csvString,
        )) as any[];

        return this.mappingProperty(
          fileContents,
          RESOURCE_PROPERTY_MAP[dirName],
        );
      }

      default:
        throw new Error(`Invalid file extension ${fileExtension}`);
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
