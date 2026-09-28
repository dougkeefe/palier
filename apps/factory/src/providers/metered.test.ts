import { describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/adapters/openai";
import type { UsageRecord } from "@palier/domain";

import { meterProvider } from "./metered.js";

const providerWith = (usage: UsageRecord | null): AiProvider => ({
  capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true, assessWriting: true, generateScenario: true, transcribe: true, speak: true, examinerTurn: true, assessOral: true }),
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
  assessWriting: () => Promise.resolve({} as never),
  generateScenario: () => Promise.resolve({ phases: [] }),
  transcribe: () => Promise.resolve({ text: "" }),
  speak: () => Promise.resolve(new Blob()),
  examinerTurn: () => Promise.resolve({ text: "q", difficulty: null }),
  assessOral: () => Promise.resolve({} as never),
  verifyKey: () => Promise.resolve(),
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

  it("accounts writing feedback like any other spending call", async () => {
    const metered = meterProvider(providerWith({ model: "m", inputTokens: 30, outputTokens: 20, costUsd: 1 }));
    await metered.provider.assessWriting({
      task: "t",
      wordTarget: 50,
      text: "Du texte.",
      targetBand: "B",
      lang: "fr",
      feedbackLang: "en",
    });
    expect(metered.totals()).toEqual({ calls: 1, inputTokens: 30, outputTokens: 20, costUsd: 1 });
  });

  it("accounts a scenario plan like any other spending call (D114)", async () => {
    const metered = meterProvider(providerWith({ model: "m", inputTokens: 40, outputTokens: 60, costUsd: 0.5 }));
    await metered.provider.generateScenario({ sessionType: "work", targetBand: "C", lang: "fr", topic: "procurement", minutes: 10 });
    expect(metered.totals()).toEqual({ calls: 1, inputTokens: 40, outputTokens: 60, costUsd: 0.5 });
  });

  it("accounts each oral call like any other spending call, though the factory makes none (D117)", async () => {
    const metered = meterProvider(providerWith({ model: "m", inputTokens: 0, outputTokens: 0, costUsd: 0.25 }));
    await metered.provider.transcribe({ audio: new Blob(["x"]), lang: "fr", durationMs: 1000 });
    await metered.provider.speak({ text: "Bonjour.", lang: "fr" });
    const turn = await metered.provider.examinerTurn({
      sessionType: "work",
      targetBand: "C",
      lang: "fr",
      topic: "procurement",
      phase: { name: "p", minutes: 1, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] },
      register: "baseline",
      transcript: [],
    });
    expect(turn.text).toBe("q");
    expect(metered.totals()).toEqual({ calls: 3, inputTokens: 0, outputTokens: 0, costUsd: 0.75 });
  });

  it("accounts an oral report like any other spending call (D122)", async () => {
    const metered = meterProvider(providerWith({ model: "m", inputTokens: 900, outputTokens: 300, costUsd: 0.02 }));
    await metered.provider.assessOral({
      sessionType: "work",
      targetBand: "C",
      lang: "fr",
      feedbackLang: "en",
      topic: "procurement",
      phases: [{ name: "p", intent: "i" }],
      turns: [],
      descriptors: { A: "a", B: "b", C: "c" },
    });
    expect(metered.totals()).toEqual({ calls: 1, inputTokens: 900, outputTokens: 300, costUsd: 0.02 });
  });

  it("passes a key check through and accounts nothing for it", async () => {
    let checks = 0;
    const inner = { ...providerWith({ model: "m", inputTokens: 10, outputTokens: 5, costUsd: 1 }), verifyKey: () => {
      checks += 1;
      return Promise.resolve();
    } };
    const metered = meterProvider(inner);
    await metered.provider.verifyKey();
    expect(checks).toBe(1);
    expect(metered.totals()).toEqual({ calls: 0, inputTokens: 0, outputTokens: 0, costUsd: null });
  });
});
