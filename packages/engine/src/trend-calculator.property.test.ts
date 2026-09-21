import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Attempt, Item } from "@palier/domain";
import { itemId } from "@palier/domain";

import { MIN_EVIDENCE, TREND_WINDOW, calculateTrend } from "./trend-calculator.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * implementation-plan.md §6.2, tier 2:
 *   "Wilson interval correctness. Computed intervals match a reference
 *    implementation across the full range of proportions and sample sizes,
 *    including the degenerate cases of 0 and 100 percent."
 *   "Monotonicity. Answering an additional item correctly never decreases the
 *    ability estimate, and answering incorrectly never increases it."
 */

const DAY = 24 * 60 * 60 * 1000;

/** `n` attempts on B-tagged reading items, the first `correct` of them right. */
const bBand = (n: number, correct: number): { items: Item[]; attempts: Attempt[] } => {
  const items: Item[] = [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < n; i += 1) {
    const id = itemId(`01HITEMB${String(i).padStart(15, "0")}`);
    items.push(anItem({ id, targetBand: "B", skill: "reading" }));
    attempts.push(
      anAttempt({ itemId: id, skill: "reading", correct: i < correct, ts: new Date(i * DAY).toISOString() }),
    );
  }
  return { items, attempts };
};

/** An independent restatement of the Wilson score interval, clamped to [0, 1]. */
const referenceWilson = (x: number, n: number): { low: number; high: number } => {
  const z = 1.959963984540054;
  const p = x / n;
  const a = 1 + (z * z) / n;
  const mid = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { low: Math.max(0, (mid - half) / a), high: Math.min(1, (mid + half) / a) };
};

describe("calculateTrend properties", () => {
  it("matches a reference Wilson interval across proportions and sample sizes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_EVIDENCE, max: TREND_WINDOW }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (n, fraction) => {
          const correct = Math.round(fraction * n);
          const { items, attempts } = bBand(n, correct);

          const b = calculateTrend("reading", attempts, items).byBand.B;
          if (b.status !== "estimated") throw new Error("n >= MIN_EVIDENCE is always estimated");

          const ref = referenceWilson(correct, n);
          expect(b.interval.low).toBeCloseTo(ref.low, 10);
          expect(b.interval.high).toBeCloseTo(ref.high, 10);
        },
      ),
    );
  });

  it("never lets a correct answer lower the accuracy, nor an incorrect one raise it", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_EVIDENCE, max: TREND_WINDOW - 1 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.boolean(),
        (n, fraction, addCorrect) => {
          const correct = Math.round(fraction * n);
          const before = calculateTrend("reading", bBand(n, correct).attempts, bBand(n, correct).items).byBand.B;

          const nextCorrect = correct + (addCorrect ? 1 : 0);
          const grown = bBand(n + 1, nextCorrect);
          const after = calculateTrend("reading", grown.attempts, grown.items).byBand.B;

          if (before.status !== "estimated" || after.status !== "estimated") {
            throw new Error("both windows are at or above MIN_EVIDENCE");
          }
          if (addCorrect) {
            expect(after.accuracy).toBeGreaterThanOrEqual(before.accuracy);
          } else {
            expect(after.accuracy).toBeLessThanOrEqual(before.accuracy);
          }
        },
      ),
    );
  });
});
