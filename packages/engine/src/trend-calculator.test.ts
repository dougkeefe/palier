import { describe, expect, it } from "vitest";

import type { Attempt, Item, TargetBand } from "@palier/domain";
import { attemptId, itemId } from "@palier/domain";

import { MIN_EVIDENCE, TREND_WINDOW, calculateTrend, trendEvidence } from "./trend-calculator.js";
import { pscSle } from "./__tests__/read-profile.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * architecture.md §7.1, verbatim:
 *   "For each skill, over the last 100 scored attempts:
 *      accuracyAtB = correct on B-tagged items / B-tagged items attempted
 *      interval    = Wilson score interval at 95% on each proportion"
 *   "Minimum evidence: 30 scored items at a band tag before showing a figure."
 *
 * The band tag is the joined item's `targetBand`; an `Attempt` does not carry it
 * (progress.md D32, the join note). A day apart per attempt, so the ordering the
 * window relies on is unambiguous.
 */
const DAY = 24 * 60 * 60 * 1000;

const history = (
  band: TargetBand,
  attempted: number,
  correct: number,
  opts: { skill?: Item["skill"]; startDay?: number } = {},
): { items: Item[]; attempts: Attempt[] } => {
  const skill = opts.skill ?? "reading";
  const startDay = opts.startDay ?? 0;
  const items: Item[] = [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < attempted; i += 1) {
    const id = itemId(`01HITEM${band}${String(i).padStart(15, "0")}`);
    items.push(anItem({ id, targetBand: band, skill }));
    attempts.push(
      anAttempt({
        itemId: id,
        skill,
        correct: i < correct,
        ts: new Date((startDay + i) * DAY).toISOString(),
      }),
    );
  }
  return { items, attempts };
};

describe("calculateTrend, minimum evidence", () => {
  it("reports insufficient evidence below the threshold, naming what is still needed", () => {
    const { items, attempts } = history("B", MIN_EVIDENCE - 1, 10);

    const trend = calculateTrend("reading", attempts, items);

    expect(trend.byBand.B).toEqual({
      status: "insufficient",
      attempted: MIN_EVIDENCE - 1,
      needed: MIN_EVIDENCE,
    });
  });

  it("shows a figure at exactly the threshold, since 30 is enough", () => {
    const { items, attempts } = history("B", MIN_EVIDENCE, MIN_EVIDENCE);

    const trend = calculateTrend("reading", attempts, items);

    expect(trend.byBand.B.status).toBe("estimated");
  });

  it("treats a band with no attempts as insufficient, not as zero accuracy", () => {
    const trend = calculateTrend("reading", [], []);

    expect(trend.byBand.C).toEqual({ status: "insufficient", attempted: 0, needed: MIN_EVIDENCE });
  });
});

describe("calculateTrend, the proportion and its interval", () => {
  it("computes accuracy as correct over attempted at the band tag", () => {
    const { items, attempts } = history("C", 40, 30);

    const trend = calculateTrend("reading", attempts, items);

    const c = trend.byBand.C;
    if (c.status !== "estimated") throw new Error("expected an estimate");
    expect({ attempted: c.attempted, correct: c.correct, accuracy: c.accuracy }).toEqual({
      attempted: 40,
      correct: 30,
      accuracy: 0.75,
    });
  });

  it("matches the textbook Wilson 95% interval for 50 of 100", () => {
    const { items, attempts } = history("B", 100, 50);

    const trend = calculateTrend("reading", attempts, items);

    const b = trend.byBand.B;
    if (b.status !== "estimated") throw new Error("expected an estimate");
    // Standard reference value: Wilson 95% for p̂ = 0.5, n = 100 is [0.404, 0.596].
    expect(b.interval.low).toBeCloseTo(0.4038, 3);
    expect(b.interval.high).toBeCloseTo(0.5962, 3);
  });

  it("keeps the interval inside [0, 1] at 100% accuracy, where a naive formula overflows", () => {
    const { items, attempts } = history("C", 30, 30);

    const trend = calculateTrend("reading", attempts, items);

    const c = trend.byBand.C;
    if (c.status !== "estimated") throw new Error("expected an estimate");
    expect(c.accuracy).toBe(1);
    expect(c.interval.high).toBeLessThanOrEqual(1);
    expect(c.interval.low).toBeGreaterThan(0);
    expect(c.interval.low).toBeLessThan(1);
  });

  it("keeps the interval inside [0, 1] at 0% accuracy", () => {
    const { items, attempts } = history("C", 30, 0);

    const trend = calculateTrend("reading", attempts, items);

    const c = trend.byBand.C;
    if (c.status !== "estimated") throw new Error("expected an estimate");
    expect(c.accuracy).toBe(0);
    expect(c.interval.low).toBeGreaterThanOrEqual(0);
    expect(c.interval.high).toBeGreaterThan(0);
    expect(c.interval.high).toBeLessThan(1);
  });
});

describe("calculateTrend, the window and the joins", () => {
  it("considers only the most recent attempts, up to the window size", () => {
    // 100 recent correct on B, then 40 older incorrect on B. Only the recent
    // 100 count, so accuracy is 1, not 100/140.
    const recent = history("B", TREND_WINDOW, TREND_WINDOW, { startDay: 40 });
    const older = history("B", 40, 0, { startDay: 0 });
    // Distinct ids so the older set is not mistaken for the recent one.
    const older2 = {
      items: older.items.map((it, i) => ({ ...it, id: itemId(`01HOLD${String(i).padStart(17, "0")}`) })),
      attempts: older.attempts.map((a, i) => ({ ...a, itemId: itemId(`01HOLD${String(i).padStart(17, "0")}`) })),
    };

    const trend = calculateTrend(
      "reading",
      [...older2.attempts, ...recent.attempts],
      [...older2.items, ...recent.items],
    );

    const b = trend.byBand.B;
    if (b.status !== "estimated") throw new Error("expected an estimate");
    expect({ attempted: b.attempted, accuracy: b.accuracy, windowSize: trend.windowSize }).toEqual({
      attempted: TREND_WINDOW,
      accuracy: 1,
      windowSize: TREND_WINDOW,
    });
  });

  it("ignores an attempt whose item is not in the supplied bank", () => {
    const { attempts } = history("B", MIN_EVIDENCE, MIN_EVIDENCE);

    // No items supplied, so nothing can be joined to a band tag.
    const trend = calculateTrend("reading", attempts, []);

    expect(trend.byBand.B).toEqual({ status: "insufficient", attempted: 0, needed: MIN_EVIDENCE });
  });

  it("counts only attempts for the requested skill", () => {
    const reading = history("B", MIN_EVIDENCE, MIN_EVIDENCE, { skill: "reading" });
    const writing = history("B", MIN_EVIDENCE, 0, { skill: "writing", startDay: 200 });

    const trend = calculateTrend(
      "reading",
      [...reading.attempts, ...writing.attempts],
      [...reading.items, ...writing.items],
    );

    const b = trend.byBand.B;
    if (b.status !== "estimated") throw new Error("expected an estimate");
    expect({ attempted: b.attempted, accuracy: b.accuracy }).toEqual({
      attempted: MIN_EVIDENCE,
      accuracy: 1,
    });
  });

  it("reports the skill it was asked about", () => {
    expect(calculateTrend("writing", [], []).skill).toBe("writing");
  });
});

/** Found by the one-off mutation check (progress.md D77). */
describe("calculateTrend, an attempt whose item left the bank", () => {
  it("does not let it take a window slot from an attempt the bank can still tag", () => {
    const { items, attempts } = history("B", TREND_WINDOW, TREND_WINDOW);
    const orphan = anAttempt({ itemId: itemId("01HGONEFROMTHEBANK000000"), ts: new Date(1000 * DAY).toISOString() });

    const trend = calculateTrend("reading", [...attempts, orphan], items);

    expect(trend.byBand.B).toMatchObject({ attempted: TREND_WINDOW });
  });
});

describe("trendEvidence", () => {
  const rules = pscSle().itemStatistics;
  const stats = (responses: number) => ({ responses, proportionCorrect: 0.5, pointBiserial: 0.3, updatedAt: "2026-10-01T00:00:00.000Z" });

  it("counts nothing behind an empty trend", () => {
    expect(trendEvidence("reading", [], [], rules)).toEqual({ items: 0, trusted: 0 });
  });

  it("counts distinct items, so an item answered twice is one item", () => {
    const { items, attempts } = history("B", 3, 3);
    const again = anAttempt({ id: attemptId("01HATTEMPTAGAIN"), itemId: items[0]!.id, ts: new Date(10 * DAY).toISOString() });
    expect(trendEvidence("reading", [...attempts, again], items, rules)).toEqual({ items: 3, trusted: 0 });
  });

  it("trusts an item's statistics from the profile's minimum, and not one response before", () => {
    const { items, attempts } = history("B", 4, 4);
    const withStats = [
      { ...items[0]!, stats: stats(rules.minResponsesDifficulty) },
      { ...items[1]!, stats: stats(rules.minResponsesDifficulty + 50) },
      { ...items[2]!, stats: stats(rules.minResponsesDifficulty - 1) },
      items[3]!,
    ];
    expect(trendEvidence("reading", attempts, withStats, rules)).toEqual({ items: 4, trusted: 2 });
  });

  it("counts only the items inside the trend's window, as the trend does", () => {
    const { items, attempts } = history("B", TREND_WINDOW + 5, 0);
    // The oldest five fall outside the window; give them trusted statistics.
    const withStats = items.map((item, i) => (i < 5 ? { ...item, stats: stats(500) } : item));
    expect(trendEvidence("reading", attempts, withStats, rules)).toEqual({ items: TREND_WINDOW, trusted: 0 });
  });

  it("leaves out another skill's attempts and an item that left the bank", () => {
    const reading = history("B", 2, 2);
    const writing = history("C", 2, 2, { skill: "writing" });
    const items = [...reading.items.slice(1), ...writing.items];
    expect(trendEvidence("reading", [...reading.attempts, ...writing.attempts], items, rules)).toEqual({ items: 1, trusted: 0 });
  });
});
