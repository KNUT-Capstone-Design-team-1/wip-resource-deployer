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
  summaries: Map<string, string>,
): string[] {
  const summary = summaries.get(pill.ITEM_SEQ);

  const hasSummary = isSuccessfulSummary(summary);
  if (!hasSummary) {
    return [];
  }

  pill.EFFECT_SUMMARY = summary;

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
    return [];
  }

  const summaries = await fetchEffectSummaryMap(
    pills.map((pill) => pill.ITEM_SEQ),
  );

  return pills.flatMap((pill) => applySummary(pill, summaries));
}
