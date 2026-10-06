import { describe, expect, it } from "vitest";

import type { DiagnosticInterpretation, DiagnosticInterpretationRequest } from "./ai.js";
import { checkDiagnosticInterpretation } from "./diagnostic-interpretation.js";
import { diagnosticInterpretationSchema } from "./schemas/ai.js";

const STEM = "Les dossiers que nous avons ___ hier sont sur votre bureau.";

const request: DiagnosticInterpretationRequest = {
  skill: "writing",
  lang: "fr",
  feedbackLang: "en",
  targetBand: "C",
  startBand: "B",
  total: { correct: 18, attempted: 30 },
  bands: [
    { band: "B", correct: 11, attempted: 15 },
    { band: "C", correct: 7, attempted: 15 },
  ],
  subSkills: [{ subSkill: "agreement", correct: 1, attempted: 4 }],
  focus: ["agreement"],
  missed: [
    {
      subSkill: "agreement",
      band: "C",
      type: "cloze",
      stem: STEM,
      options: [
        { id: "a", text: "reçu" },
        { id: "b", text: "reçus" },
      ],
      chosen: "a",
      key: "b",
      explanation: "The past participle agrees with a preceding direct object.",
    },
  ],
};

const interpretation: DiagnosticInterpretation = {
  headline: "Solid at B, with C within reach.",
  summary: "Most misses were agreement after a preceding object.",
  strengths: ["Prepositions"],
  priorities: [{ subSkill: "agreement", what: "Drill participle agreement.", why: "Three of four missed." }],
  planNote: "Your plan starts at B and adds agreement practice.",
};

describe("checkDiagnosticInterpretation", () => {
  it("accepts an interpretation whose priorities are the run's own sub-skills", () => {
    expect(checkDiagnosticInterpretation(request, interpretation)).toBeNull();
  });

  it("refuses a priority on a sub-skill of the other skill", () => {
    const wrong = { ...interpretation, priorities: [{ subSkill: "main-idea" as const, what: "x", why: "y" }] };
    expect(checkDiagnosticInterpretation(request, wrong)).toMatch(/not a writing sub-skill/);
  });

  it("refuses the same sub-skill twice", () => {
    const twice = { ...interpretation, priorities: [...interpretation.priorities, ...interpretation.priorities] };
    expect(checkDiagnosticInterpretation(request, twice)).toMatch(/repeats "agreement"/);
  });

  it("refuses an interpretation that quotes a missed question, whatever its spacing or case", () => {
    const quoted = { ...interpretation, summary: `You missed "${STEM.toUpperCase().replace(/ /g, "  ")}".` };
    expect(checkDiagnosticInterpretation(request, quoted)).toMatch(/quotes a missed question/);
  });

  it("does not guard a stem so short it could appear in honest advice", () => {
    const short = { ...request, missed: [{ ...request.missed[0]!, stem: "Il ___ venu." }] };
    const advice = { ...interpretation, summary: "Watch il ___ venu." };
    expect(checkDiagnosticInterpretation(short, advice)).toBeNull();
  });
});

describe("diagnosticInterpretationSchema", () => {
  it("parses a whole interpretation", () => {
    expect(diagnosticInterpretationSchema.safeParse(interpretation).success).toBe(true);
  });

  it("needs at least one priority and allows at most three", () => {
    expect(diagnosticInterpretationSchema.safeParse({ ...interpretation, priorities: [] }).success).toBe(false);
    const four = Array.from({ length: 4 }, () => interpretation.priorities[0]);
    expect(diagnosticInterpretationSchema.safeParse({ ...interpretation, priorities: four }).success).toBe(false);
  });

  it("refuses an oral sub-skill, which the bank cannot drill", () => {
    const oral = { ...interpretation, priorities: [{ subSkill: "fluency-and-hesitation", what: "x", why: "y" }] };
    expect(diagnosticInterpretationSchema.safeParse(oral).success).toBe(false);
  });

  it("refuses an unknown field, since the shape is strict", () => {
    expect(diagnosticInterpretationSchema.safeParse({ ...interpretation, band: "B" }).success).toBe(false);
  });
});
