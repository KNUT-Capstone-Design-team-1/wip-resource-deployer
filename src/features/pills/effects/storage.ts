import fs from "fs";
import path from "path";
import { RESOURCE_DIRECTORY } from "../../../shared/paths";

export type EffectFailureReason = "http_error" | "network_error" | "empty_document" | "empty_summary" | "legacy_missing_summary" | "rate_limit_deferred";

export interface EffectSummaryFailure {
  ITEM_SEQ: string;
  reason: EffectFailureReason;
  httpStatus: number | null;
  attempts: number;
  message: string;
  firstFailedAt: string;
  lastFailedAt: string;
  previousSummary?: string | null;
}

/** 항목 ID를 검증하고 효능 문서 캐시 또는 실패 파일의 경로를 반환한다. */
export function effectFilePath(itemSeq: string, kind: "failed" | "documents", directory = RESOURCE_DIRECTORY): string {
  if (!/^\d+$/.test(itemSeq)) {
    throw new Error("Invalid ITEM_SEQ: " + itemSeq);
  }

  const folder = kind === "failed" ? "pill_effect_summary_failed" : "pill_effect_documents";
  return path.join(directory, folder, itemSeq + (kind === "failed" ? ".json" : ".xml"));
}

/** 임시 파일을 완전히 쓴 뒤 교체하여 중단 시에도 기존 파일을 보존한다. */
export async function writeAtomicFile(filePath: string, contents: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + "." + Date.now() + "." + Math.random().toString(16).slice(2) + ".tmp";

  try {
    await fs.promises.writeFile(temporaryPath, contents, "utf8");
    await fs.promises.rename(temporaryPath, filePath);
  }
  finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

/** 아직 조회하지 않은 기존 누락 요약도 원인을 추정하지 않고 재처리 목록에 등록한다. */
export async function writeEffectSummaryFailure(
  failure: Omit<EffectSummaryFailure, "firstFailedAt" | "lastFailedAt">,
  directory = RESOURCE_DIRECTORY,
): Promise<void> {
  const filePath = effectFilePath(failure.ITEM_SEQ, "failed", directory);
  let previous: EffectSummaryFailure | undefined;

  try {
    previous = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
  }
  catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
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

/** 이미 보존된 실패 원인을 유지하며 기존 누락 항목만 추가한다. */
export async function collectMissingEffectSummary(itemSeq: string, directory = RESOURCE_DIRECTORY, previousSummary?: string | null): Promise<void> {
  const filePath = effectFilePath(itemSeq, "failed", directory);

  try {
    await fs.promises.access(filePath);
  }
  catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
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

/** 리소스 저장을 완료한 성공 항목만 실패 목록에서 제거한다. */
export async function removeEffectSummaryFailure(itemSeq: string, directory = RESOURCE_DIRECTORY): Promise<void> {
  await fs.promises.rm(effectFilePath(itemSeq, "failed", directory), { force: true });
}

/** 항목별 효능 원문 캐시를 읽고 아직 캐시가 없으면 null을 반환한다. */
export async function readEffectDocument(itemSeq: string, directory = RESOURCE_DIRECTORY): Promise<string | null> {
  try {
    return await fs.promises.readFile(effectFilePath(itemSeq, "documents", directory), "utf8");
  }
  catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return null;
  }
}
