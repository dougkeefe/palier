import type { LatestExamResult } from "@palier/app";
import type { Band } from "@palier/domain";

/**
 * The readiness card's exam half (product-requirements.md §8.2 zone A): "C, 39 of
 * 50. C starts at 38." It leads the card, because it came from a full-length form
 * scored against the published cuts, and it stays visually apart from the practice
 * trend, which never becomes a band letter (D64).
 *
 * The second sentence names the cut that says the most. At the bottom of the scale
 * "X starts at 0" says nothing, so it names the next band up instead.
 */
export type ExamReadiness = {
  readonly runId: string;
  readonly band: Band;
  readonly raw: number;
  readonly scored: number;
  /** The band whose starting cut the card names, and that cut. */
  readonly cutBand: Band;
  readonly cutMin: number;
};

export const examReadiness = (latest: LatestExamResult): ExamReadiness => {
  const { outcome } = latest.result;
  // At the bottom band, name the next band's cut instead.
  const named = outcome.bandMin === 0 ? outcome.next : null;
  return {
    runId: latest.run.id,
    band: outcome.band,
    raw: outcome.raw,
    scored: outcome.scored,
    cutBand: named?.band ?? outcome.band,
    cutMin: named?.min ?? outcome.bandMin,
  };
};
