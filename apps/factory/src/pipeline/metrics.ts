import type { Item } from "@palier/domain";

import type { BatchReport, Discard, ReviewResult } from "../lib/types.js";
import type { ValidationReport } from "./validate.js";

/**
 * Tally review-gate discards by cause, so a run's `0 published` can be read at a
 * glance — is the reviewer disagreeing on the key, flagging register, misjudging
 * the band, unsure, or finding two defensible answers? Each item counts once per
 * distinct cause it tripped.
 */
export const discardReasonCounts = (discarded: readonly Discard[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  const categorise = (reason: string): string =>
    reason.startsWith("reviewer chose") ? "key-mismatch"
    : reason.startsWith("confidence") ? "low-confidence"
    : reason.startsWith("defensible distractor") ? "defensible-distractor"
    : reason.startsWith("register flag") ? "register"
    : reason.startsWith("estimated band") ? "band-mismatch"
    : "other";
  for (const item of discarded) {
    const seen = new Set<string>();
    for (const reason of item.reasons) {
      const cat = categorise(reason);
      if (!seen.has(cat)) {
        seen.add(cat);
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
    }
  }
  return counts;
};

/**
 * The per-batch metrics (content-factory.md §6), committed as JSON so the trend
 * lives in version history. Phase-1 tracks the two that gate the phase — stage-4
 * yield and cost per accepted item — plus the raw counts. Review-gate detection
 * per defect class is measured separately, against the eval set (see eval/).
 */
export type BatchMetricsInput = {
  readonly batchId: string;
  readonly generatedAt: string;
  readonly provider: string;
  readonly sources: number;
  readonly passages: number;
  readonly itemsDrafted: number;
  readonly review: ReviewResult<Item>;
  readonly validation: ValidationReport;
  readonly totalCostUsd: number | null;
};

export const batchReport = (input: BatchMetricsInput): BatchReport => {
  const itemsPassed = input.review.passed.length;
  const itemsPublished = input.validation.valid.length;
  const stage4Yield = input.itemsDrafted === 0 ? 0 : itemsPassed / input.itemsDrafted;
  const costPerAcceptedItemUsd =
    input.totalCostUsd === null || itemsPublished === 0
      ? null
      : Math.round((input.totalCostUsd / itemsPublished) * 1_000_000) / 1_000_000;

  return {
    batchId: input.batchId,
    generatedAt: input.generatedAt,
    provider: input.provider,
    counts: {
      sources: input.sources,
      passages: input.passages,
      itemsDrafted: input.itemsDrafted,
      itemsPassed,
      itemsPublished,
    },
    stage4Yield: Math.round(stage4Yield * 1000) / 1000,
    costPerAcceptedItemUsd,
    totalCostUsd:
      input.totalCostUsd === null ? null : Math.round(input.totalCostUsd * 1_000_000) / 1_000_000,
  };
};
