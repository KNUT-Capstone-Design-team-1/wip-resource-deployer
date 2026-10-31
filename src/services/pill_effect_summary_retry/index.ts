import fs from "node:fs";
import path from "node:path";

import { writeAtomicFile } from "../../utils/atomic_file";
import type {
  PillResourceFile,
  EffectRetryOptions,
} from "./types/pill_effect_summary_retry";
import logger from "../../utils/logger";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { IPillData } from "../pill_data/types/pill_data";
import { fetchEffectSummaryMap } from "../pill_data/effect_summary/client";
import { FALLBACK_EFFECT_SUMMARY } from "../pill_data/effect_summary/summary";
import { removeEffectSummaryFailure } from "../pill_data/effect_summary/storage";

/**
 * 기존 리소스 구조를 검증하여 잘못된 입력 파일을 덮어쓰지 않는다.
 */
async function readPillResource(directory: string): Promise<PillResourceFile> {
  const parsed = JSON.parse(
    await fs.promises.readFile(path.join(directory, "pill_data.json"), "utf8"),
  );

  const isInvalidResource = !!(
    !parsed ||
    !Array.isArray(parsed.resources) ||
    parsed.resources.some(
      (pill: IPillData) => !pill || !/^\d+$/.test(pill.ITEM_SEQ),
    )
  );

  if (isInvalidResource) {
    throw new Error("Invalid pill_data.json resource structure");
  }

  return parsed;
}

/**
 * 실패 기록이 없으면 빈 목록을 반환
 */
async function readFailedItemSeqs(directory: string): Promise<Set<string>> {
  try {
    const entries = await fs.promises.readdir(directory, {
      withFileTypes: true,
    });

    return new Set(
      entries
        .filter((entry) => entry.isFile() && /^\d+\.json$/.test(entry.name))
        .map((entry) => entry.name.slice(0, -5)),
    );
  } catch (error) {
    const hasUnexpectedFileError = error.code !== "ENOENT";

    if (hasUnexpectedFileError) {
      throw error;
    }

    return new Set();
  }
}

/**
 * 동일한 품목의 모든 리소스에 요약을 반영할 수 있도록 그룹화
 */
function indexPills(pills: IPillData[]) {
  const byId = new Map<string, IPillData[]>();

  for (const pill of pills) {
    const group = byId.get(pill.ITEM_SEQ) ?? [];

    group.push(pill);
    byId.set(pill.ITEM_SEQ, group);
  }

  return byId;
}

/**
 * 실패 항목만 재조회하고 체크포인트 저장을 마친 성공 항목만 실패 파일에서 제거
 */
export async function retryFailedPillEffectSummaries(
  options: EffectRetryOptions = {},
) {
  logger.info("[EE-SUMMARY-RETRY] Start retry failed effect summaries");

  // 리소스 경로와 체크포인트 간격을 준비
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const checkpointSize = options.checkpointSize ?? 50;

  // 처리 건수와 저장 간격이 유효한 값인지 확인
  const hasInvalidRetryOptions =
    !Number.isInteger(checkpointSize) ||
    checkpointSize <= 0 ||
    (options.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit <= 0));

  if (hasInvalidRetryOptions) {
    throw new Error("limit and checkpointSize must be positive integers");
  }

  // 기존 알약 리소스를 읽고 품목별로 조회할 수 있도록 그룹화
  const resource = await readPillResource(directory);

  // 기존 실패 파일 목록을 한 번 읽어 품목마다 존재 여부를 다시 확인하지 않는다.
  const failedDirectory = path.join(directory, "pill_effect_summary_failed");
  const failedItemSeqs = await readFailedItemSeqs(failedDirectory);
  const byId = indexPills(resource.resources);

  // 실패 목록에서 현재 리소스에 있는 항목만 정렬하고 처리 건수 제한을 적용
  const targets = [...failedItemSeqs]
    .filter((itemSeq) => byId.has(itemSeq))
    .sort()
    .slice(0, options.limit);
  const pendingSuccesses = new Set<string>();
  let processed = 0;
  let recovered = 0;

  /**
   * 리소스 교체가 성공한 후에만 해당 실패 파일을 삭제
   */
  async function checkpoint() {
    const hasNoPendingSuccesses = pendingSuccesses.size === 0;

    if (hasNoPendingSuccesses) {
      return;
    }

    // 복구한 요약을 리소스 파일에 먼저 저장
    await writeAtomicFile(
      path.join(directory, "pill_data.json"),
      JSON.stringify(resource, null, 2),
    );

    // 저장이 완료된 항목의 실패 파일만 제거
    for (const itemSeq of pendingSuccesses) {
      await removeEffectSummaryFailure(itemSeq, directory);
    }

    pendingSuccesses.clear();
  }

  try {
    // 실패 항목을 재조회하고 성공 결과를 반영하면서 주기적으로 저장
    await fetchEffectSummaryMap(targets, {
      ...options,
      onResult: async (itemSeq, result) => {
        processed += 1;

        const hasFailure = !!result.reason;

        if (hasFailure) {
          logger.warn(
            "[EE-SUMMARY-RETRY] Failed ITEM_SEQ=%s reason=%s status=%s attempts=%s: %s",
            itemSeq,
            result.reason,
            result.httpStatus,
            result.attempts,
            result.message,
          );
        }

        const hasRecoveredSummary =
          !result.reason && result.summary !== FALLBACK_EFFECT_SUMMARY;

        if (hasRecoveredSummary) {
          applyRecoveredSummary(byId.get(itemSeq)!, result.summary);

          pendingSuccesses.add(itemSeq);
          recovered += 1;
        }

        await options.onResult?.(itemSeq, result);

        const shouldSaveCheckpoint = processed % checkpointSize === 0;

        if (shouldSaveCheckpoint) {
          await checkpoint();
        }
      },
    });
  } finally {
    // 예상치 못한 중단에서도 지금까지 복구한 요약을 저장
    await checkpoint();
  }

  // 남아 있는 실패 항목 수를 집계해 재처리 결과를 반환
  const remainingItemSeqs = await readFailedItemSeqs(failedDirectory);
  const remaining = [...remainingItemSeqs].filter((itemSeq) =>
    failedItemSeqs.has(itemSeq),
  ).length;

  logger.info(
    "[EE-SUMMARY-RETRY] Processed=%s recovered=%s remaining=%s",
    processed,
    recovered,
    remaining,
  );

  return { processed, recovered, remaining };
}

/**
 * 복구한 요약의 동일 품목 전체 반영
 */
function applyRecoveredSummary(pills: IPillData[], summary: string) {
  for (const pill of pills) {
    pill.EFFECT_SUMMARY = summary;
  }
}
