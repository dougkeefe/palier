import { describe, expect, it } from "vitest";

import type { ReviewRequest, ReviewVerdict } from "@palier/domain";

import { recordedReviewProvider, reviewRequestHash } from "./recorded-review-provider.js";

const request = (fr: string): ReviewRequest => ({
  itemType: "cloze",
  stem: { fr, en: "en" },
  options: (["a", "b", "c", "d"] as const).map((id) => ({ id, text: `option ${id}` })),
  subSkill: "agreement",
  targetBand: "B",
  lang: "fr",
});

const verdict = (chosenKey: ReviewVerdict["chosenKey"]): ReviewVerdict => ({
  chosenKey,
  confidence: 0.9,
  defensibleDistractors: [],
  optionCases: { a: "a", b: "b", c: "c", d: "d" },
  registerFlag: { flagged: false },
  estimatedBand: "B",
});

const filed = (req: ReviewRequest, itemId: string, v: ReviewVerdict) => ({ requestHash: reviewRequestHash(req), itemId, verdict: v });

describe("recordedReviewProvider (D204)", () => {
  const first = request("Le comité ___ hier.");
  const second = request("Les dossiers ___ prêts.");

  it("answers a request with the verdict filed under its hash", async () => {
    const provider = recordedReviewProvider([
      { reviewer: "claude-opus-5-5", verdicts: [filed(first, "x-1", verdict("b")), filed(second, "x-2", verdict("c"))] },
    ]);
    await expect(provider.reviewItem(first)).resolves.toEqual(verdict("b"));
    await expect(provider.reviewItem(second)).resolves.toEqual(verdict("c"));
  });

  it("names the file's reviewer in its usage, with no cost, because none was metered", async () => {
    const provider = recordedReviewProvider([{ reviewer: "claude-opus-5-5", verdicts: [filed(first, "x-1", verdict("a"))] }]);
    expect(provider.lastUsage()).toBeNull();
    await provider.reviewItem(first);
    expect(provider.lastUsage()).toEqual({ model: "claude-opus-5-5", inputTokens: 0, outputTokens: 0 });
  });

  it("throws on a request no verdict answers, so an item edited after its review is never judged stale", async () => {
    const provider = recordedReviewProvider([{ reviewer: "r", verdicts: [filed(first, "x-1", verdict("a"))] }]);
    await expect(provider.reviewItem(request("Le comité ___ demain."))).rejects.toThrow(/no recorded verdict.*Le comité ___ demain/);
    expect(provider.lastUsage()).toBeNull();
  });

  it("refuses two verdicts for the same request, across files", () => {
    expect(() =>
      recordedReviewProvider([
        { reviewer: "r1", verdicts: [filed(first, "x-1", verdict("a"))] },
        { reviewer: "r2", verdicts: [filed(first, "x-1", verdict("b"))] },
      ]),
    ).toThrow(/item x-1: two recorded verdicts/);
  });

  it("keys a verdict to the exact request: any change to the text the reviewer saw changes the hash", () => {
    expect(reviewRequestHash(first)).toBe(reviewRequestHash(request("Le comité ___ hier.")));
    expect(reviewRequestHash(first)).not.toBe(reviewRequestHash({ ...first, targetBand: "C" }));
  });

  it("only reviews: every other method rejects, and says so in its capabilities", async () => {
    const provider = recordedReviewProvider([]);
    expect(Object.entries(provider.capabilities()).filter(([, on]) => on).map(([name]) => name)).toEqual(["reviewItem"]);
    const rejected = [
      provider.generatePassage({ topic: "procurement", docType: "memo", targetBand: "B", lang: "fr", count: 1 }),
      provider.generateItems({ promptSpec: { itemType: "cloze", targetBand: "B", subSkill: "agreement", instructions: "x" }, topic: "procurement", lang: "fr", count: 1 }),
      provider.assessWriting({} as never),
      provider.generateScenario({} as never),
      provider.transcribe({} as never),
      provider.speak({} as never),
      provider.examinerTurn({} as never),
      provider.assessOral({} as never),
      provider.interpretDiagnostic({} as never),
    ];
    for (const call of rejected) await expect(call).rejects.toThrow(/only reviews/);
    await expect(provider.verifyKey()).resolves.toBeUndefined();
    expect(provider.lastUsage()).toBeNull();
  });
});
