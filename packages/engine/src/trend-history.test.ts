import { describe, expect, it } from "vitest";

import type { Attempt, Item } from "@palier/domain";
import { attemptId, itemId } from "@palier/domain";

import { MIN_EVIDENCE, calculateTrend } from "./trend-calculator.js";
import { trendHistory, weekEnds } from "./trend-history.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * The band trend over time (PRD §8.9, progress.md D198): each point is `calculateTrend` over the
 * attempts made on or before its local day, so these examples are worked by hand against it.
 */

const item = (n: number, over: Partial<Item> = {}): Item =>
  anItem({ id: itemId(`01HITEMB${String(n).padStart(16, "0")}`), targetBand: "B", ...over });

/** `count` B-tagged reading attempts at `ts`, the first `correct` of them right. */
const attemptsAt = (ts: string, count: number, correct: number, from = 0): { items: Item[]; attempts: Attempt[] } => {
  const items: Item[] = [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < count; i += 1) {
    const n = from + i;
    items.push(item(n));
    attempts.push(
      anAttempt({ id: attemptId(`01HATT${String(n).padStart(18, "0")}`), itemId: item(n).id, correct: i < correct, ts }),
    );
  }
  return { items, attempts };
};

describe("weekEnds", () => {
  it("is the given number of local days a week apart, ending today, oldest first", () => {
    expect(weekEnds("2026-10-03", 3)).toEqual(["2026-09-19", "2026-09-26", "2026-10-03"]);
  });

  it("is today alone for one week, and nothing for none", () => {
    expect(weekEnds("2026-10-03", 1)).toEqual(["2026-10-03"]);
    expect(weekEnds("2026-10-03", 0)).toEqual([]);
  });

  it.each([[-1], [1.5], [Number.NaN]])("refuses %s weeks", (weeks) => {
    expect(() => weekEnds("2026-10-03", weeks)).toThrow(RangeError);
  });
});

describe("trendHistory", () => {
  it("is one point per cutoff, in the cutoffs' order, each insufficient before any practice", () => {
    const points = trendHistory("reading", [], [], ["2026-09-26", "2026-10-03"], "UTC");

    expect(points.map((p) => p.day)).toEqual(["2026-09-26", "2026-10-03"]);
    for (const { trend } of points) {
      expect(trend.windowSize).toBe(0);
      expect(trend.byBand.B).toEqual({ status: "insufficient", attempted: 0, needed: MIN_EVIDENCE });
    }
  });

  it("counts only the attempts made on or before each cutoff day, so the evidence grows week by week", () => {
    const early = attemptsAt("2026-09-20T15:00:00.000Z", 20, 10);
    const late = attemptsAt("2026-09-30T15:00:00.000Z", 20, 20, 20);
    const items = [...early.items, ...late.items];
    const attempts = [...early.attempts, ...late.attempts];

    const [before, first, second] = trendHistory("reading", attempts, items, ["2026-09-19", "2026-09-26", "2026-10-03"], "UTC");

    expect(before?.trend.byBand.B).toEqual({ status: "insufficient", attempted: 0, needed: MIN_EVIDENCE });
    // 20 attempts are short of the 30 a figure needs.
    expect(first?.trend.byBand.B).toEqual({ status: "insufficient", attempted: 20, needed: MIN_EVIDENCE });
    // 40 attempts, 30 right: the same figure the trend calculator gives over all of them.
    expect(second?.trend).toEqual(calculateTrend("reading", attempts, items));
    expect(second?.trend.byBand.B).toMatchObject({ status: "estimated", attempted: 40, correct: 30, accuracy: 0.75 });
  });

  it("includes the whole of the cutoff day, to its last minute", () => {
    const { items, attempts } = attemptsAt("2026-10-03T23:59:00.000Z", 30, 15);

    const [point] = trendHistory("reading", attempts, items, ["2026-10-03"], "UTC");

    expect(point?.trend.byBand.B).toMatchObject({ status: "estimated", attempted: 30 });
  });

  it("reads each attempt's day in the device's time zone, not UTC's", () => {
    // 01:30 UTC on 4 October is 21:30 on 3 October in Toronto.
    const { items, attempts } = attemptsAt("2026-10-04T01:30:00.000Z", 30, 15);

    expect(trendHistory("reading", attempts, items, ["2026-10-03"], "UTC")[0]?.trend.windowSize).toBe(0);
    expect(trendHistory("reading", attempts, items, ["2026-10-03"], "America/Toronto")[0]?.trend.windowSize).toBe(30);
  });

  it("leaves out the other skill's attempts", () => {
    const { items, attempts } = attemptsAt("2026-10-01T12:00:00.000Z", 30, 15);
    const writing = attempts.map((a) => ({ ...a, skill: "writing" as const }));

    expect(trendHistory("reading", writing, items, ["2026-10-03"], "UTC")[0]?.trend.windowSize).toBe(0);
  });

  it("drops an attempt whose item has left the bank, as the trend calculator does", () => {
    const { items, attempts } = attemptsAt("2026-10-01T12:00:00.000Z", 30, 15);

    expect(trendHistory("reading", attempts, items.slice(1), ["2026-10-03"], "UTC")[0]?.trend.windowSize).toBe(29);
  });
});
