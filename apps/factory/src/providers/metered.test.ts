import { describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/adapters/openai";
import type { UsageRecord } from "@palier/domain";

import { meterProvider } from "./metered.js";

const providerWith = (usage: UsageRecord | null): AiProvider => ({
  capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true }),
  generatePassage: () => Promise.resolve([]),
  generateItems: () => Promise.resolve([]),
  reviewItem: () =>
    Promise.resolve({
      chosenKey: "a",
      confidence: 1,
      defensibleDistractors: [],
      optionCases: { a: "", b: "", c: "", d: "" },
      registerFlag: { flagged: false },
      estimatedBand: "B",
    }),
  lastUsage: () => usage,
});

describe("meterProvider", () => {
  it("accumulates priced usage across calls", async () => {
    const metered = meterProvider(providerWith({ model: "m", inputTokens: 100, outputTokens: 50, costUsd: 2 }));
    await metered.provider.generateItems({ promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" }, topic: "human-resources", lang: "fr", count: 1 });
    await metered.provider.reviewItem({ itemType: "cloze", stem: { en: "e", fr: "f" }, options: [], subSkill: "agreement", targetBand: "B", lang: "fr" });
    const totals = metered.totals();
    expect(totals.calls).toBe(2);
    expect(totals.inputTokens).toBe(200);
    expect(totals.costUsd).toBe(4);
  });

  it("reports null cost when nothing was priced", async () => {
    const metered = meterProvider(providerWith({ model: "m", inputTokens: 10, outputTokens: 5 }));
    await metered.provider.generatePassage({ topic: "human-resources", docType: "memo", targetBand: "B", lang: "fr", count: 1 });
    expect(metered.totals().costUsd).toBeNull();
  });

  it("ignores a call that reports no usage", async () => {
    const metered = meterProvider(providerWith(null));
    await metered.provider.generateItems({ promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" }, topic: "human-resources", lang: "fr", count: 1 });
    expect(metered.totals().calls).toBe(0);
    expect(metered.provider.capabilities().reviewItem).toBe(true);
    expect(metered.provider.lastUsage()).toBeNull();
  });
});
