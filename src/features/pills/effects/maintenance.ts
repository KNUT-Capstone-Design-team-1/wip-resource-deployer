import fs from "fs";
import path from "path";
import logger from "../../../shared/logging/logger";
import { RESOURCE_DIRECTORY } from "../../../shared/paths";
import { IPillData } from "../pill_data.types";
import { fetchEffectSummaryMap, EffectSummaryOptions } from "./client";
import { FALLBACK_EFFECT_SUMMARY } from "./summary";
import { collectMissingEffectSummary, removeEffectSummaryFailure, writeAtomicFile } from "./storage";

interface PillResourceFile {
  resources: IPillData[];
  [key: string]: unknown;
}

export interface EffectRetryOptions extends EffectSummaryOptions {
  limit?: number;
  checkpointSize?: number;
}

/** 기존 리소스 구조를 검증하여 잘못된 입력 파일을 덮어쓰지 않는다. */
async function readPillResource(directory: string): Promise<PillResourceFile> {
  const parsed = JSON.parse(await fs.promises.readFile(path.join(directory, "pill_data.json"), "utf8"));

  if (!parsed || !Array.isArray(parsed.resources) || parsed.resources.some((pill: IPillData) => !pill || !/^\d+$/.test(pill.ITEM_SEQ))) {
    throw new Error("Invalid pill_data.json resource structure");
  }

  return parsed;
}

/** 누락 안내 문구 또는 빈 요약인지 확인한다. */
function isMissingSummary(summary: string | null | undefined): boolean {
  return !summary?.trim() || summary.trim() === FALLBACK_EFFECT_SUMMARY;
}

/** 실패 항목만 재조회하고 체크포인트 저장을 마친 성공 항목만 실패 파일에서 제거한다. */
export async function retryFailedPillEffectSummaries(options: EffectRetryOptions = {}): Promise<{ processed: number; recovered: number; remaining: number }> {
  const directory = options.directory ?? RESOURCE_DIRECTORY;
  const checkpointSize = options.checkpointSize ?? 50;

  if (!Number.isInteger(checkpointSize) || checkpointSize <= 0 || (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0))) {
    throw new Error("limit and checkpointSize must be positive integers");
  }

  const resource = await readPillResource(directory);
  const byId = new Map<string, IPillData[]>();

  for (const pill of resource.resources) {
    const group = byId.get(pill.ITEM_SEQ) ?? [];
    group.push(pill);
    byId.set(pill.ITEM_SEQ, group);

    if (isMissingSummary(pill.EFFECT_SUMMARY)) {
      await collectMissingEffectSummary(pill.ITEM_SEQ, directory);
    }
  }

  const failedDirectory = path.join(directory, "pill_effect_summary_failed");
  const entries = await fs.promises.readdir(failedDirectory, { withFileTypes: true }).catch((error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return [];
  });
  const itemSeqs = entries.filter((entry) => entry.isFile() && /^\d+\.json$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -5)).sort();
  const targets = itemSeqs.filter((itemSeq) => byId.has(itemSeq)).slice(0, options.limit);
  const pendingSuccesses = new Set<string>();
  let processed = 0;
  let recovered = 0;

  /** 리소스 교체가 성공한 후에만 해당 실패 파일을 삭제한다. */
  async function checkpoint(): Promise<void> {
    if (pendingSuccesses.size === 0) {
      return;
    }

    await writeAtomicFile(path.join(directory, "pill_data.json"), JSON.stringify(resource, null, 2));

    for (const itemSeq of pendingSuccesses) {
      await removeEffectSummaryFailure(itemSeq, directory);
    }

    pendingSuccesses.clear();
  }

  try {
    await fetchEffectSummaryMap(targets, 5, {
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

  const remaining = (await fs.promises.readdir(failedDirectory).catch((error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return [];
  })).filter((name) => /^\d+\.json$/.test(name)).length;
  logger.info("[EE-SUMMARY-RETRY] Processed=%s recovered=%s remaining=%s", processed, recovered, remaining);

  return { processed, recovered, remaining };
}
