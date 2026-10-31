import fs from "node:fs";
import path from "node:path";

import { ORIGIN_DATA_DIRECTORY } from "../../utils/paths";
import type { PillResourceName } from "./resource_adapter";

type PillSourceManifest = Partial<Record<PillResourceName, string[]>>;

/**
 * 의약품 원본 선택 설정 읽기·구조 검증
 */
function readPillSourceManifest(filePath: string): PillSourceManifest {
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const isInvalidManifest =
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest);

  if (isInvalidManifest) {
    throw new Error("[PILL-DATA] pill_data_sources.json은 객체여야 합니다.");
  }

  return manifest;
}

/**
 * 선택 원본 목록의 배열 형식·최소 항목 수 검증
 */
function validateSourceSelection(
  selected: unknown,
  name: PillResourceName,
): asserts selected is string[] {
  const isInvalidSelection = !Array.isArray(selected) || selected.length === 0;

  if (isInvalidSelection) {
    throw new Error(
      "[PILL-DATA] " + name + ": 원본 파일명을 하나 이상 지정하세요.",
    );
  }
}

/**
 * 선택 원본의 파일명·존재 여부 검증
 */
function validateSourceFile(
  fileName: string,
  name: PillResourceName,
  availableFiles: string[],
) {
  const isInvalidName =
    typeof fileName !== "string" ||
    /[/\\]/.test(fileName) ||
    !/\.(?:csv|xlsx?)$/i.test(fileName);

  if (isInvalidName) {
    throw new Error(
      "[PILL-DATA] " + name + ": 유효하지 않은 원본 파일명 " + String(fileName),
    );
  }

  const isMissingFile = !availableFiles.includes(fileName);

  if (isMissingFile) {
    throw new Error(
      "[PILL-DATA] " + name + ": 선택한 원본 파일이 없습니다: " + fileName,
    );
  }
}

/**
 * 의약품 디렉터리의 생성 대상 원본 선택
 */
export function selectPillResourceFiles(
  name: PillResourceName,
  availableFiles: string[],
  originDirectory = ORIGIN_DATA_DIRECTORY,
): string[] {
  const manifestPath = path.join(originDirectory, "pill_data_sources.json");
  const hasManifest = fs.existsSync(manifestPath);

  if (!hasManifest) {
    return availableFiles;
  }

  const manifest = readPillSourceManifest(manifestPath);
  const hasSelection = Object.prototype.hasOwnProperty.call(manifest, name);

  if (!hasSelection) {
    return availableFiles;
  }

  const selected = manifest[name];

  validateSourceSelection(selected, name);
  selected.forEach((fileName) =>
    validateSourceFile(fileName, name, availableFiles),
  );

  return [...new Set(selected)];
}
