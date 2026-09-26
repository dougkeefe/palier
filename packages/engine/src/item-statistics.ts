import type {
  Item,
  ItemId,
  ItemStatisticsRules,
  ItemVerdict,
  RetirementReason,
  TelemetryEvent,
} from "@palier/domain";

/**
 * Item quality statistics (architecture.md 7.6): "a group-by and a correlation,
 * not a model fit" (implementation-plan.md §7).
 *
 * - **Difficulty** is the proportion of responses that were right.
 * - **Discrimination** is the point-biserial: the correlation between getting
 *   this item right and how the rest of the exam went (`restBucket`). Negative
 *   means the item punishes the people who know the most.
 *
 * Both are computed from whole-number sums, so the result does not depend on the
 * order the events arrive in, to the last bit (D73).
 */
export type ItemStatistic = {
  readonly itemId: ItemId;
  readonly responses: number;
  readonly proportionCorrect: number;
  /** Null when every response was the same, or every bucket was: no correlation exists. */
  readonly pointBiserial: number | null;
};

type Sums = { n: number; right: number; bucket: number; bucketSquared: number; rightBucket: number };

/** Per item, in item-id order by code unit, never `localeCompare` (D73). */
export const itemStatistics = (events: readonly TelemetryEvent[]): readonly ItemStatistic[] => {
  const sums = new Map<ItemId, Sums>();

  for (const event of events) {
    const s = sums.get(event.itemId) ?? { n: 0, right: 0, bucket: 0, bucketSquared: 0, rightBucket: 0 };
    const x = event.correct ? 1 : 0;
    const y = event.restBucket;
    s.n += 1;
    s.right += x;
    s.bucket += y;
    s.bucketSquared += y * y;
    s.rightBucket += x * y;
    sums.set(event.itemId, s);
  }

  return [...sums.entries()]
    .sort(([a], [b]) => Number(a > b) - Number(a < b))
    .map(([itemId, s]) => ({
      itemId,
      responses: s.n,
      proportionCorrect: s.right / s.n,
      pointBiserial: pearson(s),
    }));
};

/**
 * Pearson's r of a 0/1 variable against the bucket, which is the point-biserial.
 * The covariance and both variances are scaled by n², so they stay whole numbers.
 */
const pearson = (s: Sums): number | null => {
  const covariance = s.n * s.rightBucket - s.right * s.bucket;
  const rightVariance = s.n * s.right - s.right * s.right;
  const bucketVariance = s.n * s.bucketSquared - s.bucket * s.bucket;
  if (rightVariance === 0 || bucketVariance === 0) return null;
  return Math.max(-1, Math.min(1, covariance / Math.sqrt(rightVariance * bucketVariance)));
};

/**
 * Which items the statistics retire (architecture.md 7.6, PRD 13.3), under the
 * profile's rules (ADR 9).
 *
 * - **The minimum counts come first.** A check below its minimum gives no reason,
 *   however extreme its number: 29 responses all right is not evidence of an easy
 *   item. The proportion is trusted from `minResponsesDifficulty`, the
 *   point-biserial from `minResponsesDiscrimination`.
 * - **The thresholds are strict.** Exactly 0.95 right, or a point-biserial of
 *   exactly 0, keeps the item.
 * - **Only items the bank holds, and has not already retired**, get a verdict.
 *   An event for an item that has left the bank has nothing left to retire.
 * - Three user reports also retire an item (PRD 13.3), but reports are GitHub
 *   issues, not events, so that rule is not applied here.
 */
export const retirementVerdicts = (
  stats: readonly ItemStatistic[],
  items: readonly Item[],
  rules: ItemStatisticsRules,
): readonly ItemVerdict[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const verdicts: ItemVerdict[] = [];

  for (const stat of stats) {
    const item = byId.get(stat.itemId);
    if (item === undefined || item.status === "retired") continue;

    const difficulty = stat.responses >= rules.minResponsesDifficulty;
    const pointBiserial = stat.pointBiserial;
    const discrimination = stat.responses >= rules.minResponsesDiscrimination && pointBiserial !== null;
    const reasons: RetirementReason[] = [];
    if (difficulty && stat.proportionCorrect > rules.pCorrectMax) reasons.push("too-easy");
    if (difficulty && stat.proportionCorrect < rules.pCorrectMin) reasons.push("too-hard");
    if (discrimination && pointBiserial < rules.pointBiserialMin) reasons.push("low-discrimination");

    verdicts.push({
      itemId: stat.itemId,
      responses: stat.responses,
      proportionCorrect: stat.proportionCorrect,
      pointBiserial,
      trusted: { difficulty, discrimination },
      reasons,
    });
  }

  return verdicts;
};
