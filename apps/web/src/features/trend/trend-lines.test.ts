import type { SkillTrend } from "@palier/engine";
import { describe, expect, it } from "vitest";

import { hasAnyEstimate, trendLines } from "./trend-lines";

const trend: SkillTrend = {
  skill: "reading",
  windowSize: 40,
  byBand: {
    A: { status: "insufficient", attempted: 3, needed: 10 },
    B: { status: "estimated", attempted: 20, correct: 17, accuracy: 0.85, interval: { low: 0.64, high: 0.948 } },
    C: { status: "insufficient", attempted: 12, needed: 10 },
  },
};

describe("trendLines", () => {
  it("draws an estimated band with the engine's own interval, and rounds only the sentence", () => {
    const [, b] = trendLines(trend, ["A", "B", "C"]);
    expect(b).toEqual({
      band: "B",
      attempted: 20,
      needed: 0,
      estimate: { accuracy: 0.85, low: 0.64, high: 0.948 },
      percents: { accuracy: 85, low: 64, high: 95 },
    });
  });

  it("draws no estimate below the evidence threshold, and says how many more answers it needs", () => {
    const [a] = trendLines(trend, ["A"]);
    expect(a).toMatchObject({ band: "A", attempted: 3, needed: 7, estimate: null });
  });

  it("never counts a negative number of answers still needed", () => {
    expect(trendLines(trend, ["C"])[0]?.needed).toBe(0);
  });

  it("keeps the order of the bands it is given", () => {
    expect(trendLines(trend, ["C", "A"]).map((l) => l.band)).toEqual(["C", "A"]);
  });
});

describe("hasAnyEstimate", () => {
  it("is true once one band has an estimate, and false while none does", () => {
    expect(hasAnyEstimate(trend)).toBe(true);
    expect(
      hasAnyEstimate({
        ...trend,
        byBand: { ...trend.byBand, B: { status: "insufficient", attempted: 0, needed: 10 } },
      }),
    ).toBe(false);
  });
});
