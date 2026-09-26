import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { capState, spendTotals } from "./spend.js";

/**
 * The meter is a function of the ledger's row *set*, as the trend is (D73): rows
 * arrive in insertion order, but no order may change a total. And the windows nest,
 * whatever the rows: a session never holds more than its week holds of it, and so on.
 */
const START = Date.parse("2026-08-01T00:00:00.000Z");
const END = Date.parse("2026-10-31T00:00:00.000Z");

const row = fc.record({
  ts: fc.integer({ min: START, max: END }).map((ms) => new Date(ms).toISOString()),
  costUsd: fc.option(fc.double({ min: 0, max: 5, noNaN: true }), { nil: null }),
});
const now = fc.integer({ min: START, max: END }).map((ms) => new Date(ms).toISOString());

describe("spendTotals, over any ledger", () => {
  it("does not depend on the order of the rows", () => {
    fc.assert(
      fc.property(fc.array(row, { maxLength: 60 }), now, (rows, at) => {
        const window = { now: at, sessionStart: at };
        const forward = spendTotals(rows, window);
        const backward = spendTotals([...rows].reverse(), window);
        expect(backward.session).toBeCloseTo(forward.session, 9);
        expect(backward.week).toBeCloseTo(forward.week, 9);
        expect(backward.month).toBeCloseTo(forward.month, 9);
        expect(backward.unpriced).toBe(forward.unpriced);
      }),
    );
  });

  it("never reports a negative figure", () => {
    fc.assert(
      fc.property(fc.array(row, { maxLength: 60 }), now, (rows, at) => {
        const totals = spendTotals(rows, { now: at, sessionStart: at });
        expect(Math.min(totals.session, totals.week, totals.month, totals.unpriced)).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});

describe("capState, over any spend", () => {
  it("never goes back down as the month's spend rises", () => {
    const rank = { none: 0, under: 1, near: 2, over: 3 } as const;
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 50, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        fc.double({ min: 0.01, max: 50, noNaN: true }),
        (a, b, cap) => {
          const [low, high] = a <= b ? [a, b] : [b, a];
          expect(rank[capState(high, cap)]).toBeGreaterThanOrEqual(rank[capState(low, cap)]);
        },
      ),
    );
  });
});
