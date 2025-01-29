import path from "path";
import fs from "fs";
import xlsParser from "simple-excel-to-json";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import {
  TLoadedResource,
  TResource,
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
  TResourceDirectoryName,
  TDrugRecognitionDirectoryName,
  TFinishedMedicinePermissionDetailDirectoryName,
  TResourceRaw,
} from "../@types";
import {
  DRUG_RECOGNITION_PROPERTY_MAP,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  RESOURCE_PROPERTY_MAP,
} from "../utils";

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
        ? fs.readdirSync(resourcePath).filter((file) => !file.startsWith(".")) // (.)숨김파일 제외
        : [];

      if (fileList.length === 0) {
        continue;
      }

      const resourceData = await this.getResources(resourcePath, fileList);
      const key = resourcePath.split(/\\|\//).pop() as TResourceDirectoryName; // 디렉터리 이름만 추출 (this.~~~dirName)

      if (key === "drug_recognition") {
        resource.drugRecognition = resourceData as Array<IDrugRecognition>;
      }

      if (key === "finished_medicine_permission_detail") {
        resource.finishedMedicinePermissionDetail =
          resourceData as Array<IFinishedMedicinePermissionDetail>;
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

  private async getResources(
    resourcePath: string,
    fileList: string[]
  ): Promise<Array<TResource>> {
    const resourceData: Array<TResource> = [];

    for await (const fileName of fileList) {
      const fileContents = await this.readFileContents(
        `${resourcePath}/${fileName}`
      );

      if (fileContents.length === 0) {
        continue;
      }

      resourceData.push(...fileContents);
    }

    return resourceData;
  }

  private async readFileContents(fileName: string): Promise<Array<TResource>> {
    const fileExtension = fileName.split(".").slice(-1)[0];

    const dirName = fileName
      .split(path.sep)
      .slice(-2)[0] as TResourceDirectoryName; // 파일 폴더 이름

    switch (fileExtension) {
      case "xlsx":
      case "xls": {
        const fileContents: { flat: () => Array<TResourceRaw> } =
          xlsParser.parseXls2Json(fileName);

        return this.mappingProperty(
          fileContents.flat(),
          RESOURCE_PROPERTY_MAP[dirName]
        );
      }

      case "csv": {
        const csvString = iconvLite.decode(fs.readFileSync(fileName), "euc-kr");
        const fileContents = (await new Converter().fromString(
          csvString
        )) as Array<TResourceRaw>;

        return this.mappingProperty(
          fileContents,
          RESOURCE_PROPERTY_MAP[dirName]
        );
      }

      default:
        throw new Error(`Invalid file extension ${fileExtension}`);
    }
  }

  private mappingProperty(
    fileContents: Array<TResourceRaw>,
    propertyMap:
      | typeof DRUG_RECOGNITION_PROPERTY_MAP
      | typeof FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP
  ): Array<TResource> {
    const mappedResources: Array<TResource> = [];
    const propertyMapEntries = Object.entries(propertyMap);

    fileContents.forEach((resourceData) => {
      const resource: Record<string, any> = {};

      propertyMapEntries.forEach(([from, to]) => {
        resource[to] = resourceData[from as keyof TResourceRaw];
      });
    });

    return mappedResources;
  }
}
