import type { Band, ExamVariant } from "@palier/domain";
import { bandRank, orderedCuts } from "@palier/domain";

/**
 * Raw score to band, through the variant's published cut table.
 *
 * "There is no model in this path at all. It is the same arithmetic the PSC
 * uses, and it is the number the product leads with." (architecture.md 7.1)
 *
 * The result carries the boundaries as well as the letter, because the results
 * screen shows "38 of 50, level C starts at 38" and computes the distance to
 * the next band from the actual cut points rather than asserting it
 * (product-requirements.md 8.5). A caller that only wants the letter reads
 * `.band`; one that wants to be honest about how close the user came has what
 * it needs without re-reading the profile.
 */
export type NextBand = {
  readonly band: Band;
  /** The lowest raw score that earns it. */
  readonly min: number;
  /** How many more marks the candidate needed. Always at least 1. */
  readonly pointsAway: number;
};

export type BandOutcome = {
  readonly band: Band;
  readonly rank: number;
  readonly raw: number;
  readonly scored: number;
  readonly bandMin: number;
  readonly bandMax: number;
  /** Null at the variant's top band, where there is nothing further to reach. */
  readonly next: NextBand | null;
};

export class RawScoreOutOfRangeError extends RangeError {
  constructor(raw: number, scored: number) {
    super(
      `A raw score of ${raw} is not possible on a variant with ${scored} scored items. Pilot items are excluded from the score (architecture.md 7.5), so the range is 0 to ${scored}.`,
    );
    this.name = "RawScoreOutOfRangeError";
  }
}

export class UnmappedRawScoreError extends Error {
  constructor(raw: number) {
    super(
      `A raw score of ${raw} maps to no band in this variant's cut table. The profile schema is supposed to make that unrepresentable, so this is a bug in the schema rather than in the data.`,
    );
    this.name = "UnmappedRawScoreError";
  }
}

/** A single rung of a cut ladder. Both `OrderedCut` and a form's `BandCut` fit. */
type Rung = { readonly band: Band; readonly min: number; readonly max: number };

/**
 * The shared core, so a variant's cuts and a form's `bandCuts` are mapped by one
 * implementation and cannot drift (implementation-plan.md §5, the divergence a
 * second mapper would invite). Sorts by `BAND_RANK` internally, so a caller
 * cannot mis-order the ladder. Exported for `scorer.ts` but deliberately kept
 * off the package barrel — callers use `mapRawScore` or `scoreExam`.
 *
 * Out of range throws rather than clamping, because a score above the scored
 * count means the caller counted pilot items and silently returning the top band
 * would hide that.
 */
export const resolveBand = (cuts: readonly Rung[], scored: number, raw: number): BandOutcome => {
  if (!Number.isInteger(raw) || raw < 0 || raw > scored) {
    throw new RawScoreOutOfRangeError(raw, scored);
  }

  const ladder = [...cuts].sort((a, b) => bandRank(a.band) - bandRank(b.band));

  const index = ladder.findIndex((rung) => raw >= rung.min && raw <= rung.max);
  const rung = ladder[index];

  if (rung === undefined) {
    throw new UnmappedRawScoreError(raw);
  }

  const higher = ladder[index + 1];

  return {
    band: rung.band,
    rank: bandRank(rung.band),
    raw,
    scored,
    bandMin: rung.min,
    bandMax: rung.max,
    next:
      higher === undefined
        ? null
        : { band: higher.band, min: higher.min, pointsAway: higher.min - raw },
  };
};

/**
 * Total over `[0, variant.scored]` by construction: `examProfileSchema` refuses
 * a profile whose cut ranges do not exactly partition that interval, so every
 * score in range hits exactly one band. `orderedCuts` does the `Partial<Record>`
 * narrowing, so nothing downstream has an `undefined` to guard against.
 */
export const mapRawScore = (variant: ExamVariant, raw: number): BandOutcome =>
  resolveBand(orderedCuts(variant), variant.scored, raw);

/** Just the letter, for callers that genuinely only want it. */
export const bandForRawScore = (variant: ExamVariant, raw: number): Band =>
  mapRawScore(variant, raw).band;

/**
 * How many more marks would have earned `target`, or null if the candidate
 * already has it or it is not offered on this variant. Reads the cut table
 * rather than asserting a gap (product-requirements.md 8.5).
 */
export const pointsToBand = (
  variant: ExamVariant,
  raw: number,
  target: Band,
): number | null => {
  const range = variant.cuts[target];
  if (range === undefined) return null;
  if (raw >= range[0]) return null;
  return range[0] - raw;
};
