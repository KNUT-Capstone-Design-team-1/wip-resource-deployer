import fs from "node:fs";
import path from "node:path";

import logger from "./logger";
import {
  RESOURCE_KEYS,
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
import { normalizeChemicalValue } from "./resource_text";
import { normalizeProhibitedListText } from "../services/prohibited_list/normalize";

const RESOURCE_NORMALIZERS: Partial<
  Record<TResourceDirectoryName, (value: unknown) => string>
> = {
  cannabis: normalizeChemicalValue,
  narcotics: normalizeChemicalValue,
  psychotropics: normalizeChemicalValue,
  prohibited_list: normalizeProhibitedListText,
};

/**
 * 확장자별 원본 로드
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
 * 원본 로드·속성 변환
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

  return mapResourceProperties(
    rows,
    RESOURCE_PROPERTY_MAP[name],
    RESOURCE_NORMALIZERS[name],
  );
}

/**
 * 원본 파일 여부 확인
 */
function isResourceFile(entry: fs.Dirent): boolean {
  const isFile = entry.isFile();
  const isHidden = entry.name.startsWith(".");
  const isTemporary = entry.name.startsWith("~$");

  return isFile && !isHidden && !isTemporary;
}

/**
 * 유효 원본 파일 수집
 */
function readResourceDirectoryEntries(directory: string): fs.Dirent[] {
  const isMissingDirectory = !fs.existsSync(directory);

  if (isMissingDirectory) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(isResourceFile);
}

/**
 * 원본 파일 통합 로드
 */
async function readResourceDirectory(name: TResourceDirectoryName) {
  const directory = path.join(ORIGIN_DATA_DIRECTORY, name);
  const files = readResourceDirectoryEntries(directory);

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
   * 리소스 로드 대상 설정
   */
  constructor(private readonly targetResources: TResourceDirectoryName[]) {}

  /**
   * 선택 리소스 로드
   */
  public async loadResource() {
    const resource: TLoadedResource = {
      cannabis: [],
      narcotics: [],
      psychotropics: [],
      prohibitedList: [],
    };

    for (const name of this.targetResources) {
      const rows = await readResourceDirectory(name);

      Object.assign(resource, { [RESOURCE_KEYS[name]]: rows });
    }

    return resource;
  }
}
