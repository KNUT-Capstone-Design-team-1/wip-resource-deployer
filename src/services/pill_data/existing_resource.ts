import fs from "node:fs";

import type { IPillData } from "./types/pill_data";

/**
 * 기존 리소스를 읽고 구조가 잘못된 파일을 덮어쓰지 않도록 검증
 */
export async function readExistingPillData(
  filePath: string,
): Promise<IPillData[]> {
  let contents: string;

  try {
    contents = await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    const isMissingFile = (error as NodeJS.ErrnoException).code === "ENOENT";

    if (isMissingFile) {
      return [];
    }

    throw error;
  }

  return parseExistingPillData(contents);
}

/**
 * 기존 알약 리소스의 구조·품목 검증
 */
function parseExistingPillData(contents: string): IPillData[] {
  const resource: unknown = JSON.parse(contents);
  const isValidResource =
    typeof resource === "object" &&
    resource !== null &&
    "resources" in resource &&
    Array.isArray(resource.resources);

  if (!isValidResource) {
    throw new Error(
      "[PILL-DATA] 기존 pill_data.json의 구조가 올바르지 않습니다.",
    );
  }

  const pills = resource.resources as IPillData[];
  const hasInvalidItem = pills.some(
    (pill) => !pill || typeof pill.ITEM_SEQ !== "string",
  );

  if (hasInvalidItem) {
    throw new Error(
      "[PILL-DATA] 기존 pill_data.json에 잘못된 품목이 있습니다.",
    );
  }

  return pills;
}

/**
 * 원본에서 생성한 모든 필드가 같은 품목의 기존 효능 요약을 그대로 보존
 * 원본 값이 바뀐 품목은 요약을 재사용하지 않는다.
 */
export function preserveUnchangedPillSummaries(
  pills: IPillData[],
  existingPills: IPillData[],
): Set<string> {
  const existingById = new Map(
    existingPills.map((pill) => [pill.ITEM_SEQ, pill]),
  );
  const preserved = new Set<string>();

  for (const pill of pills) {
    const existing = existingById.get(pill.ITEM_SEQ);
    const hasReusableSummary = hasReusablePillSummary(pill, existing);

    if (!hasReusableSummary) {
      continue;
    }

    pill.EFFECT_SUMMARY = existing.EFFECT_SUMMARY;
    preserved.add(pill.ITEM_SEQ);
  }

  return preserved;
}

/**
 * 효능 요약을 제외한 모든 원본 필드의 동일 여부 확인
 */
function hasSamePillSourceData(pill: IPillData, existing: IPillData): boolean {
  const keys = Object.keys(pill).filter(
    (key) => key !== "EFFECT_SUMMARY",
  ) as (keyof IPillData)[];
  const existingKeys = Object.keys(existing).filter(
    (key) => key !== "EFFECT_SUMMARY",
  );

  return (
    keys.length === existingKeys.length &&
    keys.every((key) => pill[key] === existing[key])
  );
}

/**
 * 원본 필드가 동일한 기존 요약의 재사용 가능 여부 확인
 */
function hasReusablePillSummary(
  pill: IPillData,
  existing: IPillData | undefined,
): existing is IPillData {
  const hasNoSummary =
    existing === undefined || existing.EFFECT_SUMMARY === undefined;

  if (hasNoSummary) {
    return false;
  }

  return hasSamePillSourceData(pill, existing);
}
