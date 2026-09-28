import { describe, expect, it } from "vitest";

import type { OralRequest } from "@palier/domain";

import { fakeAiProvider } from "./ai-provider.js";

const aSession = (turns: OralRequest["turns"]): OralRequest => ({
  sessionType: "warmup",
  targetBand: "B",
  lang: "fr",
  feedbackLang: "fr",
  topic: "human-resources",
  phases: [{ name: "Accueil", intent: "Faire connaissance." }],
  turns,
  descriptors: { A: "a", B: "b", C: "c" },
});

describe("fakeAiProvider.assessOral (D122)", () => {
  it("marks and quotes the candidate's first spoken word, skipping the examiner and a silent answer", async () => {
    const provider = fakeAiProvider();
    const report = await provider.assessOral(
      aSession([
        { speaker: "examiner", text: "Bonjour.", phase: 0, startMs: 0, endMs: 0 },
        { speaker: "candidate", text: "  ", phase: 0, startMs: 0, endMs: 0 },
        { speaker: "candidate", text: "  Bonjour, je suis agent.", phase: 0, startMs: 0, endMs: 0 },
      ]),
    );
    expect(report.errors).toEqual([{ turn: 2, start: 2, end: 10, correction: "Bonjour,", rule: expect.any(String) }]);
    expect(report.missingWords.every((word) => word.turn === 2 && word.excerpt === "Bonjour,")).toBe(true);
    expect(report.criteria.task.band).toBe("B");
  });

  it("refuses a session in which the candidate said nothing, billing nothing", async () => {
    const provider = fakeAiProvider();
    await provider.transcribe({ audio: new Blob(["x"]), lang: "fr", durationMs: 1_000 });
    await expect(
      provider.assessOral(aSession([{ speaker: "examiner", text: "Bonjour.", phase: 0, startMs: 0, endMs: 0 }])),
    ).rejects.toThrow("said nothing");
    expect(provider.lastUsage()).toBeNull();
  });
});
