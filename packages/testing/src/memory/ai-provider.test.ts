import { describe, expect, it } from "vitest";

import type { DiagnosticInterpretationRequest, OralRequest } from "@palier/domain";

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

describe("fakeAiProvider.interpretDiagnostic (ADR 25)", () => {
  const aRun = (over: Partial<DiagnosticInterpretationRequest> = {}): DiagnosticInterpretationRequest => ({
    skill: "writing",
    lang: "fr",
    feedbackLang: "en",
    targetBand: "C",
    startBand: "B",
    total: { correct: 3, attempted: 4 },
    bands: [{ band: "B", correct: 3, attempted: 4 }],
    subSkills: [
      { subSkill: "pronouns", correct: 1, attempted: 2 },
      { subSkill: "agreement", correct: 2, attempted: 2 },
    ],
    focus: ["agreement"],
    missed: [],
    ...over,
  });

  it("makes the run's focus its priorities and restates the placement", async () => {
    const out = await fakeAiProvider().interpretDiagnostic(aRun());

    expect(out.priorities.map((p) => p.subSkill)).toEqual(["agreement"]);
    expect(out.headline).toBe("3 of 4 correct.");
    expect(out.planNote).toContain("B");
  });

  it("falls back to the weakest sub-skill when the run left no focus", async () => {
    const out = await fakeAiProvider().interpretDiagnostic(aRun({ focus: [] }));

    expect(out.priorities.map((p) => p.subSkill)).toEqual(["pronouns"]);
  });

  it("still names a sub-skill of the run's own skill when the run tallied none", async () => {
    const writing = await fakeAiProvider().interpretDiagnostic(aRun({ focus: [], subSkills: [] }));
    const reading = await fakeAiProvider().interpretDiagnostic(aRun({ skill: "reading", focus: [], subSkills: [] }));

    expect(writing.priorities[0]?.subSkill).toBe("agreement");
    expect(reading.priorities[0]?.subSkill).toBe("main-idea");
  });
});
