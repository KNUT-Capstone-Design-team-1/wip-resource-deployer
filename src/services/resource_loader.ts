import path from "path";
import fs from "fs";
import xlsParser from "simple-excel-to-json";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import {
  TLoadedResource,
  TResourceData,
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
  TResourceDirectoryName,
  TDrugRecognitionDirectoryName,
  TFinishedMedicinePermissionDetailDirectoryName,
} from "../@types";

export class ResourceLoader {
  private readonly dirPath: string;
  private readonly drugRecognitionDirName: TDrugRecognitionDirectoryName; // 의약품 낱알식별정보 데이터
  private readonly finishedMedicinePermissionDetailDirName: TFinishedMedicinePermissionDetailDirectoryName; // 완제 의약품 허가 상세 데이터

  constructor() {
    this.dirPath = path.join(__dirname, `../../res`);
    this.drugRecognitionDirName = "drug_recognition";
    this.finishedMedicinePermissionDetailDirName =
      "finished_medicine_permission_detail";
  }

  public async loadResource(): Promise<TLoadedResource> {
    const resource: TLoadedResource = {
      drugRecognition: [],
      finishedMedicinePermissionDetail: [],
    };

    for await (const resourcePath of this.getPathList()) {
      const fileList = fs.existsSync(resourcePath)
        ? fs.readdirSync(resourcePath)
        : [];

      if (fileList.length === 0) {
        continue;
      }

      const resourceData = await this.getResourceData(resourcePath, fileList);
      const key = resourcePath.split(/\\|\//).pop() as TResourceDirectoryName; // 디렉터리 이름만 추출 (this.~~~dirName)

      if (key === "drug_recognition") {
        resource.drugRecognition =
          resourceData as unknown as Array<IDrugRecognition>;
      }

      if (key === "finished_medicine_permission_detail") {
        resource.finishedMedicinePermissionDetail =
          resourceData as unknown as Array<IFinishedMedicinePermissionDetail>;
      }
    }

    return resource;
  }

  private getPathList(): Array<string> {
    return [
      path.join(`${this.dirPath}/${this.drugRecognitionDirName}`),
      path.join(
        `${this.dirPath}/${this.finishedMedicinePermissionDetailDirName}`
      ),
    ];
  }

  private async getResourceData(
    resourcePath: string,
    fileList: string[]
  ): Promise<Array<TResourceData>> {
    const resourceData: Array<TResourceData> = [];

    for await (const fileName of fileList) {
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

  private async convertToObject(
    fileName: string
  ): Promise<Array<TResourceData>> {
    const fileExtension = fileName.split(".").slice(-1)[0];

    switch (fileExtension) {
      case "xlsx":
      case "xls": {
        const doc: { flat: () => Object[] } = xlsParser.parseXls2Json(fileName);
        return doc.flat() as unknown as Array<TResourceData>;
      }

      case "csv": {
        const csvString = iconvLite.decode(fs.readFileSync(fileName), "euc-kr");
        const rows: Array<Object> = await new Converter().fromString(csvString);
        return rows as unknown as Array<TResourceData>;
      }

      case "json": {
        const jsonStr = fs.readFileSync(fileName, "utf-8");
        return JSON.parse(jsonStr) as unknown as Array<TResourceData>;
      }

      default:
        throw new Error(`Invalid file extension ${fileExtension}`);
    }
  }
}
