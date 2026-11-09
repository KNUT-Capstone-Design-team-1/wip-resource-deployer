import { writeAtomicFile } from "../../utils/atomic_file";
import type {
  PillResourceFile,
  EffectRetryOptions,
} from "./types/pill_effect_summary_retry";
import fs from "fs";
import path from "path";
import logger from "../../utils/logger";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { IPillData } from "../pill_data/types/pill_data";
import { fetchEffectSummaryMap } from "../pill_data/effect_summary/client";
import { FALLBACK_EFFECT_SUMMARY } from "../pill_data/effect_summary/summary";
import { removeEffectSummaryFailure } from "../pill_data/effect_summary/storage";

/**
 * 알약 리소스 로드·검증
 */
async function readPillResource(directory: string): Promise<PillResourceFile> {
  const parsed = JSON.parse(
    await fs.promises.readFile(path.join(directory, "pill_data.json"), "utf8"),
  );

  if (
    !parsed ||
    !Array.isArray(parsed.resources) ||
    parsed.resources.some(
      (pill: IPillData) => !pill || !/^\d+$/.test(pill.ITEM_SEQ),
    )
  ) {
    throw new Error("Invalid pill_data.json resource structure");
  }

  return parsed;
}

/**
 * 실패 품목 ID 조회
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
  } catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }

    return new Set();
  }
}

/**
 * 동일 품목별 그룹 생성
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
 * 실패 효능 요약 재조회
 */
export async function retryFailedPillEffectSummaries(
  options: EffectRetryOptions = {},
) {
  logger.info("[EE-SUMMARY-RETRY] Start retry failed effect summaries");

  // 리소스 경로를 준비한다.
  const directory = options.directory ?? RESOURCE_DIRECTORY;

  validateRetryOptions(options);

  // 기존 알약 리소스를 읽고 품목별로 조회할 수 있도록 묶는다.
  const resource = await readPillResource(directory);

  // 기존 실패 파일 목록을 한 번 읽어 품목마다 존재 여부를 다시 확인하지 않는다.
  const failedDirectory = path.join(directory, "pill_effect_summary_failed");

  const failedItemSeqs = await readFailedItemSeqs(failedDirectory);
  const byId = indexPills(resource.resources);

  // 실패 목록에서 현재 리소스에 있는 항목만 정렬하고 처리 건수 제한을 적용한다.
  const targets = [...failedItemSeqs]
    .filter((itemSeq) => byId.has(itemSeq))
    .sort()
    .slice(0, options.limit);
  const pendingSuccesses = new Set<string>();
  let processed = 0;
  let recovered = 0;

  /**
   * 복구 요약 저장·실패 정리
   */
  async function checkpoint() {
    if (pendingSuccesses.size === 0) {
      return;
    }

    // 복구한 요약을 리소스 파일에 먼저 저장한다.
    await writeAtomicFile(
      path.join(directory, "pill_data.json"),
      JSON.stringify(resource, null, 2),
    );

    // 저장이 완료된 항목의 실패 파일만 제거한다.
    for (const itemSeq of pendingSuccesses) {
      await removeEffectSummaryFailure(itemSeq, directory);
    }

    pendingSuccesses.clear();
  }

  try {
    // 실패 항목을 재조회하고 성공할 때마다 저장 후 실패 파일을 제거한다.
    await fetchEffectSummaryMap(targets, {
      ...options,
      onResult: async (itemSeq, result) => {
        processed += 1;

        if (result.reason) {
          logger.warn(
            "[EE-SUMMARY-RETRY] Failed ITEM_SEQ=%s reason=%s status=%s attempts=%s: %s",
            itemSeq,
            result.reason,
            result.httpStatus,
            result.attempts,
            result.message,
          );
        }

        if (!result.reason && result.summary !== FALLBACK_EFFECT_SUMMARY) {
          for (const pill of byId.get(itemSeq)!) {
            pill.EFFECT_KEYWORD = result.keyword;
            pill.EFFECT_SUMMARY = result.summary;
          }

          pendingSuccesses.add(itemSeq);

          // 다음 항목 조회나 외부 콜백 전에 결과 저장과 실패 파일 정리를 완료
          await checkpoint();
          recovered += 1;
        }

        await options.onResult?.(itemSeq, result);
      },
    });
  } finally {
    // 예상치 못한 중단에서도 지금까지 복구한 요약을 저장한다.
    await checkpoint();
  }

  // 남아 있는 실패 항목 수를 집계해 재처리 결과를 반환한다.
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

function validateRetryOptions(options: EffectRetryOptions) {
  if (options.limit !== undefined) validatePositiveInteger(options.limit);
}

function validatePositiveInteger(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("limit must be a positive integer");
  }
}
