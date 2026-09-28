import { describe, expect, it } from "vitest";

import {
  examinerTurnSchema,
  itemDraftSchema,
  passageDraftSchema,
  reviewVerdictSchema,
  scenarioDraftSchema,
  writingAssessmentSchema,
  writingFeedbackDraftSchema,
} from "../schemas/ai.js";

const aLocalised = () => ({ en: "en text", fr: "texte fr" });

const anOption = (id: "a" | "b" | "c" | "d") => ({
  id,
  text: `option ${id}`,
  rationale: aLocalised(),
});

const aValidItemDraft = (over: Record<string, unknown> = {}) => ({
  type: "cloze",
  stem: aLocalised(),
  options: [anOption("a"), anOption("b"), anOption("c"), anOption("d")],
  key: "a",
  explanation: aLocalised(),
  subSkill: "agreement",
  targetBand: "B",
  topic: "human-resources",
  ...over,
});

const aValidPassageDraft = (over: Record<string, unknown> = {}) => ({
  lang: "fr",
  docType: "memo",
  title: "Une note",
  body: "Un corps de texte.",
  targetBand: "B",
  topic: "finance-and-budgets",
  ...over,
});

const aValidVerdict = (over: Record<string, unknown> = {}) => ({
  chosenKey: "a",
  confidence: 0.9,
  defensibleDistractors: [],
  optionCases: { a: "case a", b: "case b", c: "case c", d: "case d" },
  registerFlag: { flagged: false },
  estimatedBand: "B",
  ...over,
});

describe("itemDraftSchema", () => {
  it("accepts a valid draft", () => {
    expect(itemDraftSchema.safeParse(aValidItemDraft()).success).toBe(true);
  });

  it("accepts a cloze draft carrying a blankIndex", () => {
    expect(itemDraftSchema.safeParse(aValidItemDraft({ blankIndex: 2 })).success).toBe(true);
  });

  it("rejects an unknown item type", () => {
    expect(itemDraftSchema.safeParse(aValidItemDraft({ type: "essay" })).success).toBe(false);
  });

  it("rejects a stem missing a locale", () => {
    expect(itemDraftSchema.safeParse(aValidItemDraft({ stem: { en: "only en" } })).success).toBe(
      false,
    );
  });

  it("rejects an unknown extra field (strict)", () => {
    expect(itemDraftSchema.safeParse(aValidItemDraft({ id: "01H" })).success).toBe(false);
  });
});

describe("passageDraftSchema", () => {
  it("accepts a valid draft", () => {
    expect(passageDraftSchema.safeParse(aValidPassageDraft()).success).toBe(true);
  });

  it("rejects an unknown docType", () => {
    expect(passageDraftSchema.safeParse(aValidPassageDraft({ docType: "poster" })).success).toBe(
      false,
    );
  });

  it("rejects an empty body", () => {
    expect(passageDraftSchema.safeParse(aValidPassageDraft({ body: "" })).success).toBe(false);
  });
});

describe("reviewVerdictSchema", () => {
  it("accepts a valid verdict", () => {
    expect(reviewVerdictSchema.safeParse(aValidVerdict()).success).toBe(true);
  });

  it("accepts a verdict flagging register with a note", () => {
    const verdict = aValidVerdict({ registerFlag: { flagged: true, note: "reads as European" } });
    expect(reviewVerdictSchema.safeParse(verdict).success).toBe(true);
  });

  it("accepts a verdict naming a defensible distractor", () => {
    expect(reviewVerdictSchema.safeParse(aValidVerdict({ defensibleDistractors: ["b"] })).success).toBe(
      true,
    );
  });

  it("rejects confidence above 1", () => {
    expect(reviewVerdictSchema.safeParse(aValidVerdict({ confidence: 1.5 })).success).toBe(false);
  });

  it("rejects an option case keyed by a non-option id", () => {
    const verdict = aValidVerdict({ optionCases: { z: "nope" } });
    expect(reviewVerdictSchema.safeParse(verdict).success).toBe(false);
  });

  it("rejects an unknown estimated band", () => {
    expect(reviewVerdictSchema.safeParse(aValidVerdict({ estimatedBand: "X" })).success).toBe(false);
  });
});

const aCriterion = { band: "B", evidence: "Le registre est soutenu." };
const fiveCriteria = () => ({
  register: aCriterion,
  structure: aCriterion,
  grammar: aCriterion,
  vocabulary: aCriterion,
  task: aCriterion,
});

const aValidFeedbackDraft = (over: Record<string, unknown> = {}) => ({
  criteria: fiveCriteria(),
  errors: [{ excerpt: "est reporter", correction: "est reportée", rule: "Accord du participe passé" }],
  modelAnswer: "Je vous informe que la réunion est reportée.",
  ...over,
});

const aValidAssessment = (over: Record<string, unknown> = {}) => ({
  criteria: fiveCriteria(),
  errors: [{ start: 3, end: 9, correction: "est reportée", rule: "Accord" }],
  modelAnswer: "Je vous informe que la réunion est reportée.",
  ...over,
});

describe("writingFeedbackDraftSchema", () => {
  it("accepts a valid draft, and one with no errors", () => {
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft()).success).toBe(true);
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ errors: [] })).success).toBe(true);
  });

  it("accepts any PSC band for a criterion, X and E included", () => {
    const criteria = { ...fiveCriteria(), grammar: { band: "X", evidence: "e" }, task: { band: "E", evidence: "e" } };
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ criteria })).success).toBe(true);
  });

  it("refuses a missing criterion", () => {
    const { task: _task, ...four } = fiveCriteria();
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ criteria: four })).success).toBe(false);
  });

  it("refuses a criterion the feedback does not have", () => {
    const criteria = { ...fiveCriteria(), spelling: aCriterion };
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ criteria })).success).toBe(false);
  });

  it("refuses a band that is not a PSC level, and blank evidence", () => {
    const badBand = { ...fiveCriteria(), register: { band: "D", evidence: "e" } };
    const blank = { ...fiveCriteria(), register: { band: "B", evidence: "" } };
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ criteria: badBand })).success).toBe(false);
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ criteria: blank })).success).toBe(false);
  });

  it("refuses an error given as offsets rather than an excerpt", () => {
    const errors = [{ start: 0, end: 3, correction: "c", rule: "r" }];
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ errors })).success).toBe(false);
  });

  it("refuses a blank model answer", () => {
    expect(writingFeedbackDraftSchema.safeParse(aValidFeedbackDraft({ modelAnswer: "" })).success).toBe(false);
  });
});

describe("writingAssessmentSchema", () => {
  it("accepts a valid assessment", () => {
    expect(writingAssessmentSchema.safeParse(aValidAssessment()).success).toBe(true);
  });

  it("refuses a negative start, a zero end and a fractional offset", () => {
    for (const bad of [
      { start: -1, end: 2 },
      { start: 0, end: 0 },
      { start: 0.5, end: 2 },
    ]) {
      const errors = [{ ...bad, correction: "c", rule: "r" }];
      expect(writingAssessmentSchema.safeParse(aValidAssessment({ errors })).success).toBe(false);
    }
  });

  it("refuses an error given as an excerpt rather than offsets", () => {
    const errors = [{ excerpt: "x", correction: "c", rule: "r" }];
    expect(writingAssessmentSchema.safeParse(aValidAssessment({ errors })).success).toBe(false);
  });
});

const aPhase = (over: Record<string, unknown> = {}) => ({
  name: "Mise en train",
  minutes: 2,
  intent: "Établir une base.",
  seedQuestions: ["Parlez-moi de votre rôle."],
  escalation: ["Qu'auriez-vous fait autrement ?"],
  deescalation: ["Décrivez une journée type."],
  ...over,
});

describe("scenarioDraftSchema", () => {
  it("accepts a phase plan", () => {
    expect(scenarioDraftSchema.safeParse({ phases: [aPhase(), aPhase({ name: "Suite", minutes: 3 })] }).success).toBe(true);
  });

  it("rejects a plan with no phases", () => {
    expect(scenarioDraftSchema.safeParse({ phases: [] }).success).toBe(false);
  });

  it("rejects a phase with no seed question", () => {
    expect(scenarioDraftSchema.safeParse({ phases: [aPhase({ seedQuestions: [] })] }).success).toBe(false);
  });

  it("rejects a phase of no minutes", () => {
    expect(scenarioDraftSchema.safeParse({ phases: [aPhase({ minutes: 0 })] }).success).toBe(false);
  });

  it("rejects a field the factory assembles, such as the id", () => {
    expect(scenarioDraftSchema.safeParse({ id: "s-1", phases: [aPhase()] }).success).toBe(false);
  });
});

describe("examinerTurnSchema", () => {
  it("accepts a question with no difficulty flag", () => {
    expect(examinerTurnSchema.safeParse({ text: "Parlez-moi de votre poste.", difficulty: null }).success).toBe(true);
  });

  it("accepts either direction as a flag", () => {
    expect(examinerTurnSchema.safeParse({ text: "Et si le budget était réduit ?", difficulty: "escalate" }).success).toBe(true);
    expect(examinerTurnSchema.safeParse({ text: "Que faites-vous le matin ?", difficulty: "deescalate" }).success).toBe(true);
  });

  it("rejects an empty or blank question", () => {
    expect(examinerTurnSchema.safeParse({ text: "   ", difficulty: null }).success).toBe(false);
  });

  it("rejects a flag that is not a direction, and a missing flag", () => {
    expect(examinerTurnSchema.safeParse({ text: "Bonjour.", difficulty: "harder" }).success).toBe(false);
    expect(examinerTurnSchema.safeParse({ text: "Bonjour." }).success).toBe(false);
  });

  it("rejects a field it does not define, such as a note", () => {
    expect(examinerTurnSchema.safeParse({ text: "Bonjour.", difficulty: null, note: "good" }).success).toBe(false);
  });
});
