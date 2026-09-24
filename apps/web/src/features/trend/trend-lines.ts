import type { TargetBand } from "@palier/domain";
import type { SkillTrend } from "@palier/engine";

/** One band tag's line on the readiness card: a drawable estimate, or the evidence still needed. */
export type TrendLine = {
  readonly band: TargetBand;
  readonly attempted: number;
  /** Answers still needed before a figure is shown; 0 once there is an estimate. */
  readonly needed: number;
  /** The meter's input, or null below `MIN_EVIDENCE` (R10: no estimate without evidence). */
  readonly estimate: { readonly accuracy: number; readonly low: number; readonly high: number } | null;
  /** Whole percentages for the sentence beside the meter. */
  readonly percents: { readonly accuracy: number; readonly low: number; readonly high: number };
};

const pct = (unit: number) => Math.round(unit * 100);

/**
 * A skill's trend as one line per band, in the order given. `needed` counts down to
 * zero, and the interval is carried through untouched, so the page shows the same
 * uncertainty the engine computed and nothing narrower.
 */
export const trendLines = (trend: SkillTrend, bands: readonly TargetBand[]): TrendLine[] =>
  bands.map((band) => {
    const b = trend.byBand[band];
    if (b.status === "insufficient") {
      return {
        band,
        attempted: b.attempted,
        needed: Math.max(0, b.needed - b.attempted),
        estimate: null,
        percents: { accuracy: 0, low: 0, high: 0 },
      };
    }
    return {
      band,
      attempted: b.attempted,
      needed: 0,
      estimate: { accuracy: b.accuracy, low: b.interval.low, high: b.interval.high },
      percents: { accuracy: pct(b.accuracy), low: pct(b.interval.low), high: pct(b.interval.high) },
    };
  });

/** Whether any band has enough evidence to show a figure. */
export const hasAnyEstimate = (trend: SkillTrend): boolean =>
  Object.values(trend.byBand).some((b) => b.status === "estimated");
