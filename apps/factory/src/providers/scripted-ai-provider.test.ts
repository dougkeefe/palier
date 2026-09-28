import { describe, expect, it } from "vitest";

import type { ItemType, TargetBand } from "@palier/domain";

import { estimateBand, normaliseStem, tokenJaccard } from "../lib/text.js";
import { NEAR_DUPLICATE_THRESHOLD } from "../pipeline/validate.js";
import { scriptedAiProvider, scriptedScenario, stemForBand } from "./scripted-ai-provider.js";

const draftStem = async (band: TargetBand, type: ItemType = "cloze"): Promise<string> => {
  const [draft] = await scriptedAiProvider().generateItems({
    promptSpec: { itemType: type, targetBand: band, subSkill: "agreement", instructions: "" },
    topic: "procurement",
    lang: "fr",
    count: 1,
  });
  return draft!.stem.fr;
};

describe("stemForBand", () => {
  it("reads at the band it was built for", () => {
    for (const band of ["A", "B", "C"] as const) expect(estimateBand(stemForBand(band, "s"))).toBe(band);
  });

  it("is a pure function of its seed", () => {
    expect(stemForBand("C", "same")).toBe(stemForBand("C", "same"));
  });

  it("keeps stems from seeds differing only in their last character apart", () => {
    // The old polynomial hash put these on consecutive word indices, so a large
    // batch collapsed into near-duplicates (D82).
    const stems = Array.from({ length: 200 }, (_, i) => normaliseStem(stemForBand("B", `seed:${String(i)}`)));
    let nearDuplicates = 0;
    for (let a = 0; a < stems.length; a++) {
      for (let b = a + 1; b < stems.length; b++) {
        if (tokenJaccard(stems[a]!, stems[b]!) >= NEAR_DUPLICATE_THRESHOLD) nearDuplicates++;
      }
    }
    expect(nearDuplicates).toBe(0);
  });
});

describe("scriptedAiProvider.generateItems", () => {
  it("draws different stems for requests that differ only by band", async () => {
    expect(await draftStem("B")).not.toBe(await draftStem("C"));
  });

  it("draws different stems for requests that differ only by item type", async () => {
    expect(await draftStem("B", "cloze")).not.toBe(await draftStem("B", "error-id"));
  });
});

describe("scriptedAiProvider.verifyKey", () => {
  it("accepts without a call, since the scripted provider holds no key and bills nothing", async () => {
    const provider = scriptedAiProvider();
    await expect(provider.verifyKey()).resolves.toBeUndefined();
    expect(provider.lastUsage()).toBeNull();
  });

  it("leaves no earlier call's usage behind (D102)", async () => {
    const provider = scriptedAiProvider();
    await provider.generatePassage({ topic: "finance-and-budgets", docType: "memo", targetBand: "B", lang: "fr", count: 1 });
    expect(provider.lastUsage()).not.toBeNull();
    await provider.verifyKey();
    expect(provider.lastUsage()).toBeNull();
  });
});

describe("scriptedAiProvider.assessWriting", () => {
  it("says it does not assess writing, in its capabilities and when asked, and bills nothing", async () => {
    const provider = scriptedAiProvider();
    await provider.generatePassage({ topic: "finance-and-budgets", docType: "memo", targetBand: "B", lang: "fr", count: 1 });
    expect(provider.capabilities().assessWriting).toBe(false);
    await expect(
      provider.assessWriting({ task: "t", wordTarget: 50, text: "Du texte.", targetBand: "B", lang: "fr", feedbackLang: "en" }),
    ).rejects.toThrow("does not assess writing");
    expect(provider.lastUsage()).toBeNull();
  });
});

describe("scriptedAiProvider's oral methods (D117)", () => {
  it("says it runs no spoken session, in its capabilities and when asked, and bills nothing", async () => {
    const provider = scriptedAiProvider();
    const caps = provider.capabilities();
    expect([caps.transcribe, caps.speak, caps.examinerTurn]).toEqual([false, false, false]);
    const calls = [
      () => provider.transcribe({ audio: new Blob(["x"]), lang: "fr", durationMs: 1000 }),
      () => provider.speak({ text: "Bonjour.", lang: "fr" }),
      () =>
        provider.examinerTurn({
          sessionType: "work",
          targetBand: "C",
          lang: "fr",
          topic: "procurement",
          phase: { name: "p", minutes: 1, intent: "i", seedQuestions: ["q"], escalation: [], deescalation: [] },
          register: "baseline",
          transcript: [],
        }),
    ];
    for (const call of calls) {
      await provider.generatePassage({ topic: "finance-and-budgets", docType: "memo", targetBand: "B", lang: "fr", count: 1 });
      await expect(call()).rejects.toThrow(/scripted provider/);
      expect(provider.lastUsage()).toBeNull();
    }
  });
});

describe("the scripted scenario plan (D114)", () => {
  const request = (sessionType: "warmup" | "work" | "opinion" | "situation" | "full", minutes: number) =>
    ({ sessionType, targetBand: "C", lang: "fr", topic: "procurement", minutes }) as const;

  it.each([
    ["warmup", 5, [3, 2]],
    ["work", 10, [4, 3, 3]],
    ["opinion", 12, [4, 4, 4]],
    ["situation", 8, [3, 3, 2]],
    ["full", 22, [5, 5, 4, 4, 4]],
  ] as const)("plans a %s session of %i minutes as %j, filling it exactly", (type, minutes, split) => {
    const { phases } = scriptedScenario(request(type, minutes));
    expect(phases.map((p) => p.minutes)).toEqual(split);
    for (const phase of phases) {
      expect(phase.seedQuestions).toHaveLength(1);
      expect(phase.escalation).toHaveLength(1);
      expect(phase.deescalation).toHaveLength(1);
    }
  });

  it("is a pure function of the request, and differs between requests", () => {
    expect(scriptedScenario(request("work", 10))).toEqual(scriptedScenario(request("work", 10)));
    expect(scriptedScenario({ ...request("work", 10), topic: "environment" })).not.toEqual(scriptedScenario(request("work", 10)));
  });

  it("bills the call and says it can plan scenarios", async () => {
    const provider = scriptedAiProvider();
    await provider.generateScenario(request("work", 10));
    expect(provider.capabilities().generateScenario).toBe(true);
    expect(provider.lastUsage()).toMatchObject({ model: "scripted", inputTokens: 250 });
  });
});
