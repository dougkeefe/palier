import { describe, expect, it } from "vitest";

import {
  CAP_WARNING_PERCENT,
  capState,
  estimateFeatureCost,
  monthStart,
  preflight,
  spendTotals,
  weekStart,
} from "./spend.js";

const at = (iso: string): number => Date.parse(iso);

describe("weekStart", () => {
  it("is the same day's midnight UTC on a Monday", () => {
    expect(weekStart("2026-09-28T15:30:00.000Z")).toBe(at("2026-09-28T00:00:00.000Z"));
  });

  it("goes back to Monday from a Sunday, the week's last day", () => {
    expect(weekStart("2026-10-04T23:59:59.999Z")).toBe(at("2026-09-28T00:00:00.000Z"));
  });

  it("crosses a month boundary when the week began in the last one", () => {
    expect(weekStart("2026-10-01T08:00:00.000Z")).toBe(at("2026-09-28T00:00:00.000Z"));
  });

  it("reads an offset instant in UTC, not in its own zone", () => {
    // Monday 01:00 in Toronto (-04:00) is still Monday, 05:00 UTC.
    expect(weekStart("2026-09-28T01:00:00-04:00")).toBe(at("2026-09-28T00:00:00.000Z"));
    // Sunday 22:00 in Toronto is Monday 02:00 UTC, so the new week has begun.
    expect(weekStart("2026-09-27T22:00:00-04:00")).toBe(at("2026-09-28T00:00:00.000Z"));
  });

  it("refuses something that is not an instant", () => {
    expect(() => weekStart("not a date")).toThrow(RangeError);
  });
});

describe("monthStart", () => {
  it("is the 1st at midnight UTC", () => {
    expect(monthStart("2026-09-26T12:00:00.000Z")).toBe(at("2026-09-01T00:00:00.000Z"));
  });

  it("is the instant itself at the very start of a month", () => {
    expect(monthStart("2026-10-01T00:00:00.000Z")).toBe(at("2026-10-01T00:00:00.000Z"));
  });

  it("refuses something that is not an instant", () => {
    expect(() => monthStart("")).toThrow(RangeError);
  });
});

describe("spendTotals", () => {
  const window = { now: "2026-10-01T12:00:00.000Z", sessionStart: "2026-10-01T11:00:00.000Z" };

  it("is zero on an empty ledger", () => {
    expect(spendTotals([], window)).toEqual({ session: 0, week: 0, month: 0, unpriced: 0 });
  });

  it("counts a row in every window it falls in, with each start inclusive", () => {
    const totals = spendTotals(
      [
        { ts: "2026-10-01T11:00:00.000Z", costUsd: 1 }, // session start: all three
        { ts: "2026-10-01T00:00:00.000Z", costUsd: 2 }, // month start: week and month
        { ts: "2026-09-28T00:00:00.000Z", costUsd: 4 }, // week start (a Monday): week only
        { ts: "2026-09-27T23:59:59.999Z", costUsd: 8 }, // last week, last month: none
      ],
      window,
    );
    expect(totals).toEqual({ session: 1, week: 7, month: 3, unpriced: 0 });
  });

  it("counts an unpriced row as nothing, and says how many there were this month", () => {
    const totals = spendTotals(
      [
        { ts: "2026-10-01T11:30:00.000Z", costUsd: null },
        { ts: "2026-09-29T00:00:00.000Z", costUsd: null }, // this week, last month
        { ts: "2026-10-01T11:31:00.000Z", costUsd: 0.5 },
      ],
      window,
    );
    expect(totals).toEqual({ session: 0.5, week: 0.5, month: 0.5, unpriced: 1 });
  });

  it("still counts a row stamped after now, because the money was spent", () => {
    expect(spendTotals([{ ts: "2026-10-01T13:00:00.000Z", costUsd: 1 }], window).month).toBe(1);
  });

  it("refuses a session start that is not an instant", () => {
    expect(() => spendTotals([], { now: window.now, sessionStart: "soon" })).toThrow(RangeError);
  });
});

describe("estimateFeatureCost", () => {
  const models = { draft: "m-small", review: "m-large" };
  const prices = {
    "m-small": { inputPerMTok: 1, outputPerMTok: 4 },
    "m-large": { inputPerMTok: 2, outputPerMTok: 8 },
  };

  it("prices each call's tokens at its role's model", () => {
    const cost = estimateFeatureCost(
      [
        { role: "draft", inputTokens: 1_000_000, outputTokens: 500_000 }, // 1 + 2
        { role: "review", inputTokens: 250_000, outputTokens: 125_000 }, // 0.5 + 1
      ],
      models,
      prices,
    );
    expect(cost).toBeCloseTo(4.5, 10);
  });

  it("is zero for a feature that makes no call", () => {
    expect(estimateFeatureCost([], models, prices)).toBe(0);
  });

  it("is null when a role names no model", () => {
    expect(estimateFeatureCost([{ role: "assess", inputTokens: 1, outputTokens: 1 }], models, prices)).toBeNull();
  });

  it("is null when the model has no price", () => {
    expect(
      estimateFeatureCost([{ role: "draft", inputTokens: 1, outputTokens: 1 }], { draft: "m-new" }, prices),
    ).toBeNull();
  });
});

describe("capState", () => {
  it("is none without a cap", () => {
    expect(capState(1_000, null)).toBe("none");
  });

  it("warns at exactly 80 percent and not a micro-dollar before", () => {
    expect(CAP_WARNING_PERCENT).toBe(80);
    expect(capState(0.24, 0.3)).toBe("near"); // 0.3 × 0.8 is 0.24000000000000002 as a float
    expect(capState(0.239999, 0.3)).toBe("under");
  });

  it("is over at exactly the cap", () => {
    expect(capState(5, 5)).toBe("over");
    expect(capState(4.999999, 5)).toBe("near");
    expect(capState(7, 5)).toBe("over");
  });

  it("is under with nothing spent", () => {
    expect(capState(0, 5)).toBe("under");
  });
});

describe("preflight", () => {
  it("reports the state before and after the estimate is spent", () => {
    expect(preflight({ estimateUsd: 0.5, monthUsd: 3.6, capUsd: 5 })).toEqual({
      estimateUsd: 0.5,
      before: "under",
      after: "near",
    });
  });

  it("says when a call would cross the cap", () => {
    expect(preflight({ estimateUsd: 1, monthUsd: 4.5, capUsd: 5 })).toMatchObject({ before: "near", after: "over" });
  });

  it("cannot move the state without an estimate", () => {
    expect(preflight({ estimateUsd: null, monthUsd: 4.5, capUsd: 5 })).toEqual({
      estimateUsd: null,
      before: "near",
      after: "near",
    });
  });

  it("is none after as well as before without a cap", () => {
    expect(preflight({ estimateUsd: 100, monthUsd: 0, capUsd: null })).toMatchObject({ before: "none", after: "none" });
  });
});
