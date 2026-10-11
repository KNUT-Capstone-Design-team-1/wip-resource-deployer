import { writeAtomicFile } from "../../../utils/atomic_file";
import type { EffectSummaryFailure } from "../types/effect_summary";
import fs from "fs";
import path from "path";
import { RESOURCE_DIRECTORY } from "../../../utils/paths";

/**
 * 항목 ID를 검증하고 효능 문서 캐시 또는 실패 파일의 경로를 반환한다.
 */
export function effectFilePath(itemSeq: string, kind: "failed" | "documents", directory = RESOURCE_DIRECTORY) {
  if (!/^\d+$/.test(itemSeq)) {
    throw new Error("Invalid ITEM_SEQ: " + itemSeq);
  }

  const folder = kind === "failed" ? "pill_effect_summary_failed" : "pill_effect_documents";

  return path.join(directory, folder, itemSeq + (kind === "failed" ? ".json" : ".xml"));
}

/**
 * 아직 조회하지 않은 기존 누락 요약도 원인을 추정하지 않고 재처리 목록에 등록한다.
 */
export async function writeEffectSummaryFailure(
  failure: Omit<EffectSummaryFailure, "firstFailedAt" | "lastFailedAt">,
  directory = RESOURCE_DIRECTORY,
) {
  const filePath = effectFilePath(failure.ITEM_SEQ, "failed", directory);
  let previous: EffectSummaryFailure | undefined;

  try {
    previous = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
  }
  catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
  }

  // 실제 요청을 하지 않은 항목은 기존 실패 원인과 파일을 그대로 보존한다.
  if (failure.reason === "rate_limit_deferred" && previous) {
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
 * 이미 보존된 실패 원인을 유지하며 기존 누락 항목만 추가한다.
 */
export async function collectMissingEffectSummary(itemSeq: string, directory = RESOURCE_DIRECTORY, previousSummary?: string | null) {
  const filePath = effectFilePath(itemSeq, "failed", directory);

  try {
    await fs.promises.access(filePath);
  }
  catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }

    await writeEffectSummaryFailure({
      ITEM_SEQ: itemSeq,
      reason: "legacy_missing_summary",
      previousSummary,
      httpStatus: null,
      attempts: 0,
      message: "기존 리소스의 요약이 누락되어 재조회가 필요합니다. 당시 HTTP 상태는 알 수 없습니다.",
    }, directory);
  }
}

/**
 * 리소스 저장을 완료한 성공 항목만 실패 목록에서 제거한다.
 */
export async function removeEffectSummaryFailure(itemSeq: string, directory = RESOURCE_DIRECTORY) {
  await fs.promises.rm(effectFilePath(itemSeq, "failed", directory), { force: true });
}

/**
 * 항목별 효능 원문 캐시를 읽고 아직 캐시가 없으면 null을 반환한다.
 */
export async function readEffectDocument(itemSeq: string, directory = RESOURCE_DIRECTORY) {
  try {
    return await fs.promises.readFile(effectFilePath(itemSeq, "documents", directory), "utf8");
  }
  catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }

    return null;
  }
}

/** 효능 원문 캐시 폴더만 삭제한다. */
export async function removeEffectDocuments(directory = RESOURCE_DIRECTORY) {
  const resourceDirectory = path.resolve(directory);
  const documentsDirectory = path.resolve(resourceDirectory, "pill_effect_documents");

  if (path.dirname(documentsDirectory) !== resourceDirectory) {
    throw new Error("Invalid effect documents directory");
  }

  await fs.promises.rm(documentsDirectory, { recursive: true, force: true });
}
