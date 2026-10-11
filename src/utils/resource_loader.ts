import fs from "fs";
import path from "path";
import {
  TLoadedResource,
  TResource,
  TResourceDirectoryName,
} from "./types/resources";
import { RESOURCE_PROPERTY_MAP } from "./resource_property_maps";
import { mappingProperty } from "./resource_mapper";
import {
  readExcelContents,
  readCSVContents,
  readPDFContents,
} from "./resource_readers";
import { ORIGIN_DATA_DIRECTORY } from "./paths";

/**
 * 리소스 이름의 밑줄 표기를 camelCase 속성명으로 변환한다.
 */
function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, character: string) =>
    character.toUpperCase(),
  );
}

/**
 * 확장자에 맞는 리더로 원본 파일을 읽고 리소스 속성명을 매핑한다.
 */
async function readResourceFile(
  filePath: string,
  name: TResourceDirectoryName,
) {
  const extension = path.extname(filePath).toLowerCase();
  let rows: unknown[];

  switch (extension) {
    case ".xlsx":
    case ".xls":
      rows = await readExcelContents(filePath);
      break;
    case ".csv":
      rows = await readCSVContents(filePath);
      break;
    case ".pdf":
      rows = await readPDFContents(filePath);
      break;
    default:
      throw new Error("Invalid file extension " + extension);
  }

  return mappingProperty(rows, RESOURCE_PROPERTY_MAP[name]);
}

/**
 * 지정한 원본 디렉터리의 파일을 순차적으로 읽어 모든 행을 합친다.
 */
async function readResourceDirectory(name: TResourceDirectoryName) {
  const directory = path.join(ORIGIN_DATA_DIRECTORY, name);
  const exists = fs.existsSync(directory);

  if (!exists) {
    return [];
  }

  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."));
  const rows: TResource[] = [];

  for (const file of files) {
    const contents = await readResourceFile(
      path.join(directory, file.name),
      name,
    );

    contents.forEach((row) => rows.push(row));
  }

  return rows;
}

/**
 * 대상 디렉터리 수집만 담당하며 읽기와 속성 매핑은 별도 모듈에 위임한다.
 */
export class ResourceLoader {
  /**
   * 불러올 리소스 목록을 보관한다.
   */
  constructor(private readonly targetResources: TResourceDirectoryName[]) {}

  /**
   * 선택한 리소스의 원본을 읽어 종류별 배열로 반환한다.
   */
  public async loadResource() {
    const resource: TLoadedResource = {
      drugRecognition: [],
      finishedMedicinePermissionDetail: [],
      cannabis: [],
      narcotics: [],
      psychotropics: [],
      prohibitedList: [],
      functionalFoodNutrients: [],
    };

    for (const name of this.targetResources) {
      const rows = await readResourceDirectory(name);

      Object.assign(resource, { [snakeToCamel(name)]: rows });
    }

    return resource;
  }
}
