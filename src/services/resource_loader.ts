import path from "path";
import fs from "fs";
import xlsParser from "simple-excel-to-json";
import iconvLite from "iconv-lite";
import { Converter } from "csvtojson/v2/Converter";
import {
  DRUG_RECOGNITION_PROPERTY_MAP,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  IDrugRecognition,
  IFinishedMedicinePermissionDetail,
} from "../@types/realm";
import {
  TLoadedResource,
  TResourceDirectoryName,
  TResource,
  TResourceRaw,
} from "../@types/resource";
import {
  INearbyPharmacies,
  NEARBY_PHARMACIES_PROPERTY_MAP,
} from "../@types/d1/nearby_pharmacies";
import { RESOURCE_PROPERTY_MAP } from "../utils";

type TTargetResources = Array<TResourceDirectoryName>;

export class ResourceLoader {
  private readonly dirPath: string;
  private readonly targetResources: TTargetResources;

  constructor(targetResources: TTargetResources) {
    this.dirPath = path.join(__dirname, `../../res`);
    this.targetResources = targetResources;
  }

  public async loadResource(): Promise<TLoadedResource> {
    const resource: TLoadedResource = {
      drugRecognition: [],
      finishedMedicinePermissionDetail: [],
      nearbyPharmacies: [],
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

      if (key === "nearby_pharmacies") {
        resource.nearbyPharmacies = resourceData as Array<INearbyPharmacies>;
      }
    }

    return resource;
  }

  private getPathList(): Array<string> {
    return this.targetResources.map((dirName) =>
      path.join(`${this.dirPath}/${dirName}`)
    );
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
      .split(/\\|\//)
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
      | typeof NEARBY_PHARMACIES_PROPERTY_MAP
  ): Array<TResource> {
    const mappedResources: Array<TResource> = [];
    const propertyMapEntries = Object.entries(propertyMap);

    fileContents.forEach((resourceData) => {
      const resource: Record<string, any> = {};

      propertyMapEntries.forEach(([from, to]) => {
        resource[to] = resourceData[from as keyof TResourceRaw];
      });

      mappedResources.push(resource as TResource);
    });

    return mappedResources;
  }
}
