import { describe, expect, it } from "vitest";

import {
  InvalidSpendCapError,
  SPEND_CAP_KEY,
  type SpendPricing,
  featureCosts,
  preflightSpend,
  setSpendCap,
  spendCap,
  spendSummary,
} from "./spend.js";
import { aCostEntry, costLedger } from "./__tests__/spend-fakes.js";
import { settingsStore } from "./__tests__/sync-fakes.js";

const NOW = "2026-10-01T12:00:00.000Z"; // a Thursday; the week began Monday 28 September
const SESSION = "2026-10-01T11:00:00.000Z";

const pricing: SpendPricing = {
  models: { draft: "m-small", review: "m-large", assess: "m-large", examiner: "m-small", transcribe: "m-minute" },
  prices: {
    "m-small": { inputPerMTok: 1, outputPerMTok: 4 },
    "m-large": { inputPerMTok: 2, outputPerMTok: 8 },
    "m-minute": { perMinute: 0.5 },
  },
  features: {
    "writing-feedback": [{ role: "assess", inputTokens: 500_000, outputTokens: 125_000 }], // 1 + 1
    "item-generation": [
      { role: "draft", inputTokens: 1_000_000, outputTokens: 250_000 }, // 1 + 1
      { role: "review", inputTokens: 250_000, outputTokens: 0 }, // 0.5
    ],
    // One minute of practice (D117).
    "oral-practice": [
      { role: "examiner", inputTokens: 100_000, outputTokens: 0 }, // 0.1
      { role: "transcribe", minutes: 0.2 }, // 0.1
    ],
  },
};

const aDevice = (rows = [aCostEntry()]) => ({
  ledger: costLedger(rows),
  settings: settingsStore(),
  clock: { now: () => NOW },
  sessionStart: SESSION,
  pricing,
});

describe("spendCap and setSpendCap", () => {
  it("has no cap until one is set", async () => {
    expect(await spendCap(aDevice())).toBeNull();
  });

  it("round-trips a cap, and removes it with null", async () => {
    const device = aDevice();
    await setSpendCap(5, device);
    expect(await spendCap(device)).toBe(5);

    await setSpendCap(null, device);
    expect(await spendCap(device)).toBeNull();
  });

  it("keeps the cap in the synced settings, under its own key (D104)", async () => {
    const device = aDevice();
    await setSpendCap(12.5, device);
    expect(await device.settings.all()).toEqual([{ key: SPEND_CAP_KEY, value: 12.5 }]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("refuses %s as a cap and stores nothing", async (cap) => {
    const device = aDevice();
    await expect(setSpendCap(cap, device)).rejects.toBeInstanceOf(InvalidSpendCapError);
    expect(await device.settings.all()).toEqual([]);
  });

  it("reads a stored value that is not a cap, from a damaged or older import, as no cap", async () => {
    const device = aDevice();
    await device.settings.set(SPEND_CAP_KEY, "five dollars");
    expect(await spendCap(device)).toBeNull();
  });
});

describe("spendSummary", () => {
  it("totals the session, week and month, and compares the month with the cap", async () => {
    const device = aDevice([
      aCostEntry({ ts: "2026-10-01T11:30:00.000Z", costUsd: 1 }), // this session
      aCostEntry({ ts: "2026-10-01T09:00:00.000Z", costUsd: 2 }), // this month, before the session
      aCostEntry({ ts: "2026-09-29T09:00:00.000Z", costUsd: 4 }), // this week, last month
      aCostEntry({ ts: "2026-09-10T09:00:00.000Z", costUsd: 8 }), // neither
    ]);
    await setSpendCap(3.5, device);

    expect(await spendSummary(device)).toEqual({
      totals: { session: 1, week: 7, month: 3, unpriced: 0 },
      capUsd: 3.5,
      cap: "near",
    });
  });

  it("reaches back to a session that began before the week and the month", async () => {
    const device = { ...aDevice([aCostEntry({ ts: "2026-09-20T09:00:00.000Z", costUsd: 2 })]), sessionStart: "2026-09-20T08:00:00.000Z" };
    expect((await spendSummary(device)).totals).toEqual({ session: 2, week: 0, month: 0, unpriced: 0 });
  });

  it("says there is no cap when none is set", async () => {
    expect(await spendSummary(aDevice([]))).toEqual({
      totals: { session: 0, week: 0, month: 0, unpriced: 0 },
      capUsd: null,
      cap: "none",
    });
  });
});

describe("featureCosts", () => {
  it("prices a typical use of every feature, in the features' order", () => {
    const costs = featureCosts(aDevice());
    expect(costs.map((c) => c.feature)).toEqual(["writing-feedback", "item-generation", "oral-practice"]);
    expect(costs[0]?.estimateUsd).toBeCloseTo(2, 10);
    expect(costs[1]?.estimateUsd).toBeCloseTo(2.5, 10);
    expect(costs[2]?.estimateUsd).toBeCloseTo(0.2, 10);
  });

  it("gives no figure for a feature whose model is unpriced", () => {
    const costs = featureCosts({ pricing: { ...pricing, prices: { "m-small": { inputPerMTok: 1, outputPerMTok: 4 } } } });
    expect(costs.map((c) => c.estimateUsd)).toEqual([null, null, null]);
  });
});

describe("preflightSpend", () => {
  it("answers the estimate and where the month would stand once it is spent", async () => {
    const device = aDevice([aCostEntry({ ts: "2026-10-01T09:00:00.000Z", costUsd: 2 })]);
    await setSpendCap(5, device);

    const answer = await preflightSpend("item-generation", device);

    expect(answer.estimateUsd).toBeCloseTo(2.5, 10);
    expect(answer).toMatchObject({ before: "under", after: "near" });
  });

  it("warns when a use would cross the cap", async () => {
    const device = aDevice([aCostEntry({ ts: "2026-10-01T09:00:00.000Z", costUsd: 4 })]);
    await setSpendCap(5, device);
    expect(await preflightSpend("writing-feedback", device)).toMatchObject({ before: "near", after: "over" });
  });

  it("prices a quantity of typical uses, such as a session's minutes of practice (D117)", async () => {
    const device = aDevice([aCostEntry({ ts: "2026-10-01T09:00:00.000Z", costUsd: 2 })]);
    await setSpendCap(5, device);

    const answer = await preflightSpend("oral-practice", device, 10);

    expect(answer.estimateUsd).toBeCloseTo(2, 10);
    expect(answer).toMatchObject({ before: "under", after: "near" });
  });

  it("spends nothing and records nothing itself", async () => {
    const device = aDevice([]);
    await preflightSpend("writing-feedback", device);
    expect(device.ledger.entries()).toEqual([]);
  });
});
