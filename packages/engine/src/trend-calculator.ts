import type { Attempt, Item, ItemId, ItemStatisticsRules, ScoredSkill, TargetBand } from "@palier/domain";
import { TARGET_BANDS } from "@palier/domain";

/**
 * The practice trend: accuracy per band tag, with an honest interval around it
 * (architecture.md §7.1). "The rough one" — not a band letter, because a band
 * letter from drill data would imply a precision that is not there. The exam is
 * the real number; this is what the app shows between exams.
 *
 * Two deliberate simplicities, both ADR 7: the interval is the closed-form
 * Wilson score interval, which needs no fitting and no parameters, and there is
 * no time-decay weighting — the window is a flat "most recent N".
 */

/** The most recent scored attempts a skill's trend is computed over (§7.1). */
export const TREND_WINDOW = 100;

/** Scored items at a band tag before a figure is shown rather than progress (§7.1). */
export const MIN_EVIDENCE = 30;

/** 95% two-sided normal quantile, for the Wilson interval. */
const Z = 1.959963984540054;

export type BandTrend =
  | {
      readonly status: "insufficient";
      /** How many attempts at this band tag have been seen so far. */
      readonly attempted: number;
      /** How many are needed before a figure is shown (`MIN_EVIDENCE`). */
      readonly needed: number;
    }
  | {
      readonly status: "estimated";
      readonly attempted: number;
      readonly correct: number;
      /** correct / attempted, in [0, 1]. */
      readonly accuracy: number;
      /** The Wilson 95% score interval, clamped to [0, 1]. */
      readonly interval: { readonly low: number; readonly high: number };
    };

export type SkillTrend = {
  readonly skill: ScoredSkill;
  /** Attempts considered, at most `TREND_WINDOW`. */
  readonly windowSize: number;
  readonly byBand: Readonly<Record<TargetBand, BandTrend>>;
};

/**
 * The Wilson score interval at confidence set by `Z`. Closed form, so this is a
 * calculation rather than a simulation, and it behaves at the extremes where the
 * naive normal approximation runs past 0 or 1. Clamped anyway, because a
 * displayed range must never read below 0% or above 100%.
 */
const wilson = (correct: number, n: number): { low: number; high: number } => {
  const p = correct / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const margin = (Z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / denom;
  return {
    low: Math.max(0, centre - margin),
    high: Math.min(1, centre + margin),
  };
};

const trendFor = (correct: number, attempted: number): BandTrend => {
  if (attempted < MIN_EVIDENCE) {
    return { status: "insufficient", attempted, needed: MIN_EVIDENCE };
  }
  return {
    status: "estimated",
    attempted,
    correct,
    accuracy: correct / attempted,
    interval: wilson(correct, attempted),
  };
};

/**
 * The attempts a skill's trend rests on: its most recent `TREND_WINDOW` attempts
 * whose item the bank still holds, each joined to its item. Shared by
 * `calculateTrend` and `trendEvidence`, so the figure and its disclosure always
 * describe the same attempts.
 */
const trendWindow = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  items: readonly Item[],
): readonly { readonly item: Item; readonly correct: boolean }[] => {
  const byId = new Map<ItemId, Item>(items.map((item) => [item.id, item]));

  // The skill's attempts, most recent first (`ts` is an ISO-8601 instant, so it
  // sorts lexically), with equal instants ordered by id — a ULID, so by creation —
  // so the window is a function of the attempt *set*, not of the order a device
  // happened to receive it in (progress.md D73). The id comparison is by code unit,
  // as IndexedDB orders keys, never `localeCompare`: collation varies by locale, and
  // two devices in two locales must still agree. Then joined to their item. An attempt whose item is not in
  // the bank drops out here rather than consuming a window slot, then the window
  // caps what remains. This is the only place the join can miss, so the empty
  // arm is exercised by the "item not in bank" test.
  return attempts
    .filter((a) => a.skill === skill)
    .sort((a, b) => b.ts.localeCompare(a.ts) || Number(b.id > a.id) - Number(b.id < a.id))
    .flatMap((a) => {
      const item = byId.get(a.itemId);
      return item === undefined ? [] : [{ item, correct: a.correct }];
    })
    .slice(0, TREND_WINDOW);
};

export const calculateTrend = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  items: readonly Item[],
): SkillTrend => {
  const window = trendWindow(skill, attempts, items).map(({ item, correct }) => ({
    band: item.targetBand,
    correct,
  }));

  const tally = new Map<TargetBand, { attempted: number; correct: number }>();
  for (const { band, correct } of window) {
    const cell = tally.get(band) ?? { attempted: 0, correct: 0 };
    cell.attempted += 1;
    if (correct) cell.correct += 1;
    tally.set(band, cell);
  }

  const byBand = Object.fromEntries(
    TARGET_BANDS.map((band) => {
      const cell = tally.get(band) ?? { attempted: 0, correct: 0 };
      return [band, trendFor(cell.correct, cell.attempted)];
    }),
  ) as Record<TargetBand, BandTrend>;

  return { skill, windowSize: window.length, byBand };
};

/**
 * What the trend rests on, for the readiness card to disclose (PRD 13.0: "the
 * estimate discloses what it rests on"): how many distinct items are behind it,
 * and how many of those have **trusted statistics**, meaning at least the
 * profile's `minResponsesDifficulty` responses. The statistics retire bad items;
 * they never reweight the trend (ADR 7), so this is a disclosure and nothing else.
 */
export type TrendEvidence = {
  readonly items: number;
  readonly trusted: number;
};

export const trendEvidence = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  items: readonly Item[],
  rules: ItemStatisticsRules,
): TrendEvidence => {
  const behind = new Map<ItemId, Item>(trendWindow(skill, attempts, items).map(({ item }) => [item.id, item]));
  const trusted = [...behind.values()].filter(
    (item) => item.stats !== undefined && item.stats.responses >= rules.minResponsesDifficulty,
  );
  return { items: behind.size, trusted: trusted.length };
};
