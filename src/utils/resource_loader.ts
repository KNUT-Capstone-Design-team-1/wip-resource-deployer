import fs from "node:fs";
import path from "node:path";

import logger from "./logger";
import {
  TLoadedResource,
  TResource,
  TResourceDirectoryName,
} from "./types/resources";
import { RESOURCE_PROPERTY_MAP } from "./resource_property_maps";
import { mapResourceProperties } from "./resource_mapper";
import {
  readExcelContents,
  readCsvContents,
  readPdfContents,
} from "./resource_readers";
import { ORIGIN_DATA_DIRECTORY } from "./paths";
import { mapPillResourceRows } from "../services/pill_data/resource_adapter";
import { selectPillResourceFiles } from "../services/pill_data/resource_sources";
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
      return readCsvContents(filePath);
    case ".pdf":
      return readPdfContents(filePath);
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
  logger.info("[RESOURCE-LOAD] Loading %s: %s", name, filePath);

  const rows = await readSourceFile(filePath);

  logger.info(
    "[RESOURCE-LOAD] Loaded %s: %s (%s rows)",
    name,
    filePath,
    rows.length,
  );

  const isPillResource =
    name === "drug_recognition" ||
    name === "finished_medicine_permission_detail";

  if (isPillResource) {
    return mapPillResourceRows(rows, name) as unknown as TResource[];
  }

  return mapResourceProperties(
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
 * 리소스 디렉터리의 유효 파일 수집·필수 디렉터리 검증
 */
function readResourceDirectoryEntries(
  directory: string,
  isPillResource: boolean,
): fs.Dirent[] {
  const isMissingDirectory = !fs.existsSync(directory);

  const shouldRejectMissingDirectory = isPillResource && isMissingDirectory;

  if (shouldRejectMissingDirectory) {
    throw new Error("[PILL-DATA] 원본 디렉터리가 없습니다: " + directory);
  }

  if (isMissingDirectory) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(isResourceFile);
}

/**
 * 원본 디렉터리 파일 순차 로드 및 행 병합
 */
async function readResourceDirectory(name: TResourceDirectoryName) {
  const isPillResource =
    name === "drug_recognition" ||
    name === "finished_medicine_permission_detail";
  const directory = path.join(ORIGIN_DATA_DIRECTORY, name);
  const files = readResourceDirectoryEntries(directory, isPillResource);

  const availableFiles = files.map((file) => file.name);
  const selectedFiles = isPillResource
    ? selectPillResourceFiles(name, availableFiles)
    : availableFiles;
  const hasNoPillSourceFiles = isPillResource && selectedFiles.length === 0;

  if (hasNoPillSourceFiles) {
    throw new Error("[PILL-DATA] 사용할 원본 파일이 없습니다: " + directory);
  }

  if (isPillResource) {
    logger.info(
      "[PILL-DATA] " + name + " sources: " + selectedFiles.join(", "),
    );
  }

  const rows: TResource[] = [];

  for (const fileName of selectedFiles) {
    const contents = await readResourceFile(
      path.join(directory, fileName),
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
