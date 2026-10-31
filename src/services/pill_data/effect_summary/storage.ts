import fs from "node:fs";
import path from "node:path";

import { writeAtomicFile } from "../../../utils/atomic_file";
import type { EffectSummaryFailure } from "../types/effect_summary";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";

/**
 * 항목 ID를 검증하고 효능 문서 캐시 또는 실패 파일의 경로를 반환
 */
export function effectFilePath(
  itemSeq: string,
  kind: "failed" | "documents",
  directory = RESOURCE_DIRECTORY,
) {
  const isInvalidItemSeq = !/^\d+$/.test(itemSeq);

  if (isInvalidItemSeq) {
    throw new Error("Invalid ITEM_SEQ: " + itemSeq);
  }

  const folder =
    kind === "failed" ? "pill_effect_summary_failed" : "pill_effect_documents";

  return path.join(
    directory,
    folder,
    itemSeq + (kind === "failed" ? ".json" : ".xml"),
  );
}

/**
 * 아직 조회하지 않은 기존 누락 요약도 원인을 추정하지 않고 재처리 목록에 등록
 */
export async function writeEffectSummaryFailure(
  failure: Omit<EffectSummaryFailure, "firstFailedAt" | "lastFailedAt">,
  directory = RESOURCE_DIRECTORY,
) {
  const filePath = effectFilePath(failure.ITEM_SEQ, "failed", directory);
  let previous: EffectSummaryFailure | undefined;

  try {
    previous = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
  } catch (error) {
    const hasUnexpectedFileError = error.code !== "ENOENT";

    if (hasUnexpectedFileError) {
      throw error;
    }
  }

  // 실제 요청을 하지 않은 항목은 기존 실패 원인과 파일을 그대로 보존
  const shouldPreservePreviousFailure = !!(
    failure.reason === "rate_limit_deferred" && previous
  );

  if (shouldPreservePreviousFailure) {
    return;
  }

  const now = new Date().toISOString();
  const record: EffectSummaryFailure = {
    ...failure,
    attempts: (previous?.attempts ?? 0) + failure.attempts,
    previousSummary: previous?.previousSummary ?? failure.previousSummary,
    firstFailedAt: previous?.firstFailedAt ?? now,
    lastFailedAt: now,
  };

  await writeAtomicFile(filePath, JSON.stringify(record, null, 2) + "\n");
}

/**
 * 이미 보존된 실패 원인을 유지하며 기존 누락 항목만 추가
 */
export async function collectMissingEffectSummary(
  itemSeq: string,
  directory = RESOURCE_DIRECTORY,
  previousSummary?: string | null,
) {
  const filePath = effectFilePath(itemSeq, "failed", directory);

  try {
    await fs.promises.access(filePath);
  } catch (error) {
    const hasUnexpectedFileError = error.code !== "ENOENT";

    if (hasUnexpectedFileError) {
      throw error;
    }

    await writeEffectSummaryFailure(
      {
        ITEM_SEQ: itemSeq,
        reason: "legacy_missing_summary",
        previousSummary,
        httpStatus: null,
        attempts: 0,
        message:
          "기존 리소스의 요약이 누락되어 재조회가 필요합니다. 당시 HTTP 상태는 알 수 없습니다.",
      },
      directory,
    );
  }
}

/**
 * 리소스 저장을 완료한 성공 항목만 실패 목록에서 제거
 */
export async function removeEffectSummaryFailure(
  itemSeq: string,
  directory = RESOURCE_DIRECTORY,
) {
  await fs.promises.rm(effectFilePath(itemSeq, "failed", directory), {
    force: true,
  });
}

/**
 * 항목별 효능 원문 캐시를 읽고 아직 캐시가 없으면 null을 반환
 */
export async function readEffectDocument(
  itemSeq: string,
  directory = RESOURCE_DIRECTORY,
) {
  try {
    return await fs.promises.readFile(
      effectFilePath(itemSeq, "documents", directory),
      "utf8",
    );
  } catch (error) {
    const hasUnexpectedFileError = error.code !== "ENOENT";

    if (hasUnexpectedFileError) {
      throw error;
    }

    return null;
  }
}

/**
 * 효능 원문 캐시 폴더만 삭제
 */
export async function removeEffectDocuments(directory = RESOURCE_DIRECTORY) {
  const resourceDirectory = path.resolve(directory);
  const documentsDirectory = path.resolve(
    resourceDirectory,
    "pill_effect_documents",
  );

  const isUnsafeDocumentsDirectory =
    path.dirname(documentsDirectory) !== resourceDirectory;

  if (isUnsafeDocumentsDirectory) {
    throw new Error("Invalid effect documents directory");
  }

  await fs.promises.rm(documentsDirectory, { recursive: true, force: true });
}
