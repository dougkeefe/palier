import type { Attempt, Item, ScoredSkill } from "@palier/domain";

import { type LocalDay, localDay, shiftDay } from "./engagement.js";
import { type SkillTrend, calculateTrend } from "./trend-calculator.js";

/**
 * The band trend over time (product-requirements.md §8.9, progress.md D198): the practice trend
 * as it stood at the end of each of a run of local days. **Each point is `calculateTrend` itself**,
 * over the attempts made on or before that day, so a point is exactly what the progress screen
 * would have shown that evening: the same window, the same Wilson interval (ADR 7), accuracy per
 * band tag and never a band letter (architecture.md §7.1). A band short of evidence at a point is
 * `insufficient` there, and a chart draws it as a gap.
 *
 * A cutoff is a **local day** in the device's time zone, not an instant, so "the end of Sunday" is
 * the user's Sunday, across a change to or from daylight time, with no arithmetic on instants. The
 * time zone is handed in; the engine reads no clock (D32).
 */

export type TrendPoint = {
  /** The last local day the point's attempts were made on. */
  readonly day: LocalDay;
  readonly trend: SkillTrend;
};

/** `weeks` local days a week apart, the last of them `today`, oldest first. */
export const weekEnds = (today: LocalDay, weeks: number): LocalDay[] => {
  if (!Number.isInteger(weeks) || weeks < 0) throw new RangeError(`${String(weeks)} is not a number of weeks.`);
  return Array.from({ length: weeks }, (_, i) => shiftDay(today, -7 * (weeks - 1 - i)));
};

/** The skill's trend at the end of each cutoff day, in the cutoffs' order. */
export const trendHistory = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  items: readonly Item[],
  cutoffs: readonly LocalDay[],
  timeZone: string,
): TrendPoint[] => {
  // Each attempt's local day once, not once per cutoff. A `LocalDay` is `YYYY-MM-DD`, so it sorts lexically.
  const dated = attempts.filter((a) => a.skill === skill).map((attempt) => ({ attempt, day: localDay(attempt.ts, timeZone) }));
  return cutoffs.map((day) => ({
    day,
    trend: calculateTrend(
      skill,
      dated.filter((d) => d.day <= day).map((d) => d.attempt),
      items,
    ),
  }));
};
