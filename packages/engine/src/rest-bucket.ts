import type { ItemId, RestBucket } from "@palier/domain";

import type { ExamResult } from "./scorer.js";

/**
 * How the rest of an exam went, in quintiles (architecture.md 9.2, PRD 15): the
 * proportion right on the *other* scored items, 0 for under a fifth up to 4 for
 * four fifths or more. It is what lets a point-biserial be computed without an
 * ability estimate (ADR 7). In one sentence: "you got 38 of your other 49 right,
 * which is the fourth fifth, bucket 3."
 *
 * Whole-number arithmetic, so a boundary like 20 of 25 lands in bucket 4 exactly
 * rather than wherever a float rounds it.
 */
export const restBucket = (correct: number, total: number): RestBucket => {
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`A rest bucket needs at least one other scored item, not ${total}.`);
  }
  if (!Number.isInteger(correct) || correct < 0 || correct > total) {
    throw new RangeError(`${correct} right of ${total} is not a count.`);
  }
  return Math.min(4, Math.floor((5 * correct) / total)) as RestBucket;
};

/**
 * The rest bucket of every item on a scored exam, pilots included.
 *
 * - **The rest is the scored items only**, because that is what the score is made
 *   of. An unanswered scored item counts as wrong, as it does in `scoreExam`.
 * - **A scored item's rest leaves itself out**, or the correlation would be
 *   inflated by the item correlating with itself.
 * - **A pilot's rest is every scored item**, since a pilot is not one of them.
 */
export const restBuckets = (result: ExamResult): ReadonlyMap<ItemId, RestBucket> => {
  const scored = result.items.filter((item) => !item.pilot);
  const scoredRight = scored.filter((item) => item.correct).length;

  return new Map(
    result.items.map((item) =>
      item.pilot
        ? [item.itemId, restBucket(scoredRight, scored.length)]
        : [item.itemId, restBucket(scoredRight - (item.correct ? 1 : 0), scored.length - 1)],
    ),
  );
};
