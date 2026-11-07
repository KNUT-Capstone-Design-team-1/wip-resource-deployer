import logger from "../../../utils/logger";
import type { EffectSummaryResult } from "../types/effect_summary";
import { IPillData } from "../types/pill_data";
import { fetchEffectSummaryMap } from "./client";
import { FALLBACK_EFFECT_SUMMARY } from "./summary";

/**
 * 요약 성공 여부 확인
 */
function isSuccessfulSummary(summary: string | undefined): summary is string {
  return Boolean(summary) && summary !== FALLBACK_EFFECT_SUMMARY;
}

/**
 * 품목별 요약 반영
 */
function applySummary(
  pill: IPillData,
  summaries: Map<string, EffectSummaryResult>,
): string[] {
  const result = summaries.get(pill.ITEM_SEQ);
  if (!result || !isSuccessfulSummary(result.summary)) {
    return [];
  }

  pill.EFFECT_KEYWORD = result.keyword;
  pill.EFFECT_SUMMARY = result.summary;

  return [pill.ITEM_SEQ];
}

/**
 * 효능 요약 보강
 */
export async function enrichEffectSummaries(
  pills: IPillData[],
  enabled: boolean,
): Promise<string[]> {
  if (!enabled) {
    logger.info("[EE-SUMMARY] Skipped enabled=false records=%s", pills.length);

    return [];
  }

  const startedAt = Date.now();

  logger.info("[EE-SUMMARY] Started records=%s", pills.length);

  const summaries = await fetchEffectSummaryMap(
    pills.map((pill) => pill.ITEM_SEQ),
  );

  const updatedIds = pills.flatMap((pill) => applySummary(pill, summaries));

  logger.info(
    "[EE-SUMMARY] Completed records=%s updated=%s preserved=%s durationMs=%s",
    pills.length,
    updatedIds.length,
    pills.length - updatedIds.length,
    Date.now() - startedAt,
  );

  return updatedIds;
}
