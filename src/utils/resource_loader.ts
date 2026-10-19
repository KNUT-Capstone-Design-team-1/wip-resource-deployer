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
import { normalizeChemicalValue } from "./resource_text";
import { normalizeProhibitedListText } from "../services/prohibited_list/normalize";

/**
 * 리소스 이름의 snake_case를 camelCase로 변환
 */
function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, character: string) =>
    character.toUpperCase(),
  );
}

const RESOURCE_NORMALIZERS: Partial<
  Record<TResourceDirectoryName, (value: unknown) => string>
> = {
  cannabis: normalizeChemicalValue,
  narcotics: normalizeChemicalValue,
  psychotropics: normalizeChemicalValue,
  prohibited_list: normalizeProhibitedListText,
};

/**
 * 확장자별 원본 파일 로드
 */
async function readSourceFile(filePath: string): Promise<unknown[]> {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".xlsx":
    case ".xls":
      return readExcelContents(filePath);
    case ".csv":
      return readCSVContents(filePath);
    case ".pdf":
      return readPDFContents(filePath);
    default:
      throw new Error("Invalid file extension " + extension);
  }
}

/**
 * 원본 로드 및 리소스별 속성·값 정규화
 */
async function readResourceFile(
  filePath: string,
  name: TResourceDirectoryName,
) {
  const rows = await readSourceFile(filePath);

  return mappingProperty(
    rows,
    RESOURCE_PROPERTY_MAP[name],
    RESOURCE_NORMALIZERS[name],
  );
}

/**
 * 일반 파일 여부 확인 및 숨김·임시 파일 제외
 */
function isResourceFile(entry: fs.Dirent): boolean {
  const isFile = entry.isFile();
  const isHidden = entry.name.startsWith(".");
  const isTemporary = entry.name.startsWith("~$");

  return isFile && !isHidden && !isTemporary;
}

/**
 * 원본 디렉터리 파일 순차 로드 및 행 병합
 */
async function readResourceDirectory(name: TResourceDirectoryName) {
  const directory = path.join(ORIGIN_DATA_DIRECTORY, name);
  const isMissingDirectory = !fs.existsSync(directory);

  if (isMissingDirectory) {
    return [];
  }

  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(isResourceFile);

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
 * 리소스별 원본 수집 및 변환 위임
 */
export class ResourceLoader {
  /**
   * 로드 대상 리소스 목록 보관
   */
  constructor(private readonly targetResources: TResourceDirectoryName[]) {}

  /**
   * 선택한 리소스 로드 및 종류별 배열 반환
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
