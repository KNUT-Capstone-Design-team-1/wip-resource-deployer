import { writeAtomicFile } from "../../utils/atomic_file";
import type { PillResourceFile, EffectRetryOptions } from "./types/pill_effect_summary_retry";
import fs from "fs";
import path from "path";
import logger from "../../utils/logger";
import { RESOURCE_DIRECTORY } from "../../utils/paths";
import { IPillData } from "../pill_data/types/pill_data";
import { fetchEffectSummaryMap } from "../pill_data/effect_summary/client";
import { FALLBACK_EFFECT_SUMMARY } from "../pill_data/effect_summary/summary";
import { collectMissingEffectSummary, removeEffectSummaryFailure } from "../pill_data/effect_summary/storage";

/**
 * 기존 리소스 구조를 검증하여 잘못된 입력 파일을 덮어쓰지 않는다.
 */
async function readPillResource(directory: string): Promise<PillResourceFile> {
  const parsed = JSON.parse(await fs.promises.readFile(path.join(directory, "pill_data.json"), "utf8"));

  if (!parsed || !Array.isArray(parsed.resources) || parsed.resources.some((pill: IPillData) => !pill || !/^\d+$/.test(pill.ITEM_SEQ))) {
    throw new Error("Invalid pill_data.json resource structure");
  }

  return parsed;
}

/**
 * 누락 안내 문구 또는 빈 요약인지 확인한다.
 */
function isMissingSummary(summary: string | null | undefined) {
  return !summary?.trim() || summary.trim() === FALLBACK_EFFECT_SUMMARY;
}

/**
 * 실패 항목만 재조회하고 체크포인트 저장을 마친 성공 항목만 실패 파일에서 제거한다.
 */
export async function retryFailedPillEffectSummaries(options: EffectRetryOptions = {}) {
  // 리소스 경로와 체크포인트 간격을 준비한다.
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const checkpointSize = options.checkpointSize ?? 50;

  // 처리 건수와 저장 간격이 유효한 값인지 확인한다.
  if (!Number.isInteger(checkpointSize) || checkpointSize <= 0 || (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0))) {
    throw new Error("limit and checkpointSize must be positive integers");
  }

  // 기존 알약 리소스를 읽고 품목별로 조회할 수 있도록 묶는다.
  const resource = await readPillResource(directory);

  // 기존 실패 파일 목록을 한 번 읽어 품목마다 존재 여부를 다시 확인하지 않는다.
  const failedDirectory = path.join(directory, "pill_effect_summary_failed");
  const entries = await fs.promises.readdir(failedDirectory, { withFileTypes: true }).catch((e) => {
    if (e.code !== "ENOENT") {
      throw e;
    }

    return [];
  });
  const failedItemSeqs = new Set(entries
    .filter((entry) => entry.isFile() && /^\d+\.json$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -5)));
  const byId = new Map<string, IPillData[]>();

  // 품목을 인덱싱하고 누락된 요약을 실패 목록에 추가한다.
  for (const pill of resource.resources) {
    const group = byId.get(pill.ITEM_SEQ) ?? [];

    group.push(pill);
    byId.set(pill.ITEM_SEQ, group);

    if (isMissingSummary(pill.EFFECT_SUMMARY) && !failedItemSeqs.has(pill.ITEM_SEQ)) {
      await collectMissingEffectSummary(pill.ITEM_SEQ, directory, pill.EFFECT_SUMMARY);
      failedItemSeqs.add(pill.ITEM_SEQ);
    }
  }

  // 실패 목록에서 현재 리소스에 있는 항목만 정렬하고 처리 건수 제한을 적용한다.
  const targets = [...failedItemSeqs].filter((itemSeq) => byId.has(itemSeq)).sort().slice(0, options.limit);
  const pendingSuccesses = new Set<string>();
  let processed = 0;
  let recovered = 0;

  /**
   * 리소스 교체가 성공한 후에만 해당 실패 파일을 삭제한다.
   */
  async function checkpoint() {
    if (pendingSuccesses.size === 0) {
      return;
    }

    // 복구한 요약을 리소스 파일에 먼저 저장한다.
    await writeAtomicFile(path.join(directory, "pill_data.json"), JSON.stringify(resource, null, 2));

    // 저장이 완료된 항목의 실패 파일만 제거한다.
    for (const itemSeq of pendingSuccesses) {
      await removeEffectSummaryFailure(itemSeq, directory);
    }

    pendingSuccesses.clear();
  }

  try {
    // 실패 항목을 재조회하고 성공 결과를 반영하면서 주기적으로 저장한다.
    await fetchEffectSummaryMap(targets, {
      ...options,
      onResult: async (itemSeq, result) => {
        processed += 1;

        if (!result.reason && result.summary !== FALLBACK_EFFECT_SUMMARY) {
          for (const pill of byId.get(itemSeq)!) {
            pill.EFFECT_SUMMARY = result.summary;
          }

          pendingSuccesses.add(itemSeq);
          recovered += 1;
        }

        await options.onResult?.(itemSeq, result);

        if (processed % checkpointSize === 0) {
          await checkpoint();
        }
      },
    });
  }
  finally {
    // 예상치 못한 중단에서도 지금까지 복구한 요약을 저장한다.
    await checkpoint();
  }

  // 남아 있는 실패 항목 수를 집계해 재처리 결과를 반환한다.
  const remaining = (await fs.promises.readdir(failedDirectory).catch((e) => {
    if (e.code !== "ENOENT") {
      throw e;
    }

    return [];
  })).filter((name) => /^\d+\.json$/.test(name)).length;

  logger.info("[EE-SUMMARY-RETRY] Processed=%s recovered=%s remaining=%s", processed, recovered, remaining);

  return { processed, recovered, remaining };
}
