import path from "path";
import fs from "fs";
import xlsParser from "simple-excel-to-json";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import { logger } from "../utils";

export class ResourceLoader {
  private readonly dirPath: string;
  private readonly drugRecognitionDirName: string; // 의약품 낱알식별정보 데이터
  private readonly finishedMedicinePermissionDetailsDirName: string; // 완제 의약품 허가 상세 데이터

  constructor() {
    this.dirPath = path.join(__dirname, `../../res`);

    this.drugRecognitionDirName = "drug_recognition";

    this.finishedMedicinePermissionDetailsDirName =
      "finished_medecine_permission_details";
  }

  public async loadResource(): Promise<Record<string, object[]>> {
    const resource: Record<string, Array<object>> = {};

    logger.info('Start load resource');

    for await (const resourcePath of this.getPathList()) {
      const fileList = fs.existsSync(resourcePath)
        ? fs.readdirSync(resourcePath)
        : [];

      if (fileList.length === 0) {
        continue;
      }

      const resourceData = await this.getResourceData(resourcePath, fileList);

      const key = resourcePath.split(/\\|\//).pop() as string; // 디렉터리 이름만 추출 (this.~~~dirName)

      resource[key].push(...resourceData);
    }

    logger.info('Resource load complete');

    return resource;
  }

  private getPathList(): Array<string> {
    return [
      path.join(__dirname, `${this.dirPath}/${this.drugRecognitionDirName}`),
      path.join(
        __dirname,
        `${this.dirPath}/${this.finishedMedicinePermissionDetailsDirName}`
      ),
    ];
  }

  private async getResourceData(
    resourcePath: string,
    fileList: string[]
  ): Promise<Array<Object>> {
    const resourceData: Array<Object> = [];

    for await (const fileName of fileList) {
      logger.info('Convert to object target: %s', fileName);

      const jsonArrOfFile = await this.convertToObject(
        `${resourcePath}/${fileName}`
      );

      if (jsonArrOfFile.length === 0) {
        continue;
      }

      resourceData.push(...jsonArrOfFile);
    }

    return resourceData;
  }

  private async convertToObject(fileName: string): Promise<Array<Object>> {
    const fileExtension = fileName.split(".").slice(-1)[0];

    switch (fileExtension) {
      case "xlsx":
      case "xls": {
        const doc: { flat: () => Object[] } = xlsParser.parseXls2Json(fileName);
        return doc.flat();
      }

      case "csv": {
        const csvString = iconvLite.decode(fs.readFileSync(fileName), "euc-kr");
        const rows: Array<Object> = await new Converter().fromString(csvString);
        return rows;
      }

      case "json": {
        const jsonStr = fs.readFileSync(fileName, "utf-8");
        return JSON.parse(jsonStr);
      }

      default:
        throw new Error(`Invalid file extension ${fileExtension}`);
    }
  }
}
