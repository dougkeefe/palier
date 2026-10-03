import type { SkillTrend, TrendPoint } from "@palier/engine";
import { describe, expect, it } from "vitest";

import { TREND_HISTORY_WEEKS, dayInstant, hasHistory, historyBand, historyRows } from "./trend-history";

const insufficient = { status: "insufficient", attempted: 12, needed: 30 } as const;
const estimated = { status: "estimated", attempted: 40, correct: 30, accuracy: 0.75, interval: { low: 0.6, high: 0.86 } } as const;

const trend = (b: SkillTrend["byBand"]["B"]): SkillTrend => ({
  skill: "reading",
  windowSize: 40,
  byBand: { A: insufficient, B: b, C: insufficient },
});

const points: TrendPoint[] = [
  { day: "2026-09-26", trend: trend(insufficient) },
  { day: "2026-10-03", trend: trend(estimated) },
];

describe("the trend over time's decisions (D198)", () => {
  it("draws twelve weeks", () => {
    expect(TREND_HISTORY_WEEKS).toBe(12);
  });

  it("follows the study profile's target band, or the highest band before one is set", () => {
    expect(historyBand("B")).toBe("B");
    expect(historyBand(null)).toBe("C");
  });

  it("is one row per week at the band, carrying the trend's line unchanged", () => {
    const rows = historyRows(points, "B");

    expect(rows.map((r) => r.day)).toEqual(["2026-09-26", "2026-10-03"]);
    expect(rows[0]?.line).toMatchObject({ band: "B", estimate: null, needed: 18 });
    expect(rows[1]?.line).toMatchObject({ band: "B", estimate: { accuracy: 0.75, low: 0.6, high: 0.86 }, percents: { accuracy: 75 } });
  });

  it("has a history only once a week has a figure at the band", () => {
    expect(hasHistory(historyRows(points, "B"))).toBe(true);
    expect(hasHistory(historyRows(points, "C"))).toBe(false);
    expect(hasHistory([])).toBe(false);
  });

  it("names a local day as noon UTC, so formatting it in UTC keeps the day", () => {
    expect(dayInstant("2026-10-03").toISOString()).toBe("2026-10-03T12:00:00.000Z");
  });
});
