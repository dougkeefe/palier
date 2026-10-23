import { describe, expect, it } from "vitest";

import type { Translation, TranslationDraft, TranslationRequest } from "./ai.js";
import { translationDraftSchema, translationSchema } from "./schemas/ai.js";
import { assembleTranslation, checkTranslation } from "./translation.js";

const FRENCH = "Je suis allé au réunion hier, et les notes que j’ai rédigé sont jointes.";

const asks = (over: Partial<TranslationRequest> = {}): TranslationRequest => ({
  text: FRENCH,
  source: null,
  target: "fr",
  feedbackLang: "en",
  ...over,
});

const correctionDraft = (over: Partial<TranslationDraft> = {}): TranslationDraft => ({
  source: "fr",
  output: "Je suis allé à la réunion hier, et les notes que j’ai rédigées sont jointes.",
  strengths: ["The past tense with être is right."],
  corrections: [
    { excerpt: "rédigé", correction: "rédigées", why: "The direct object comes first.", subSkill: "agreement" },
    { excerpt: "au réunion", correction: "à la réunion", why: "Réunion is feminine.", subSkill: "prepositions-and-government" },
  ],
  notes: [],
  ...over,
});

const translationDraft = (over: Partial<TranslationDraft> = {}): TranslationDraft => ({
  source: "en",
  output: "Le Conseil du Trésor a approuvé la présentation.",
  strengths: [],
  corrections: [],
  notes: [{ source: "Treasury Board submission", rendering: "présentation au Conseil du Trésor", why: "The federal term." }],
  ...over,
});

describe("assembleTranslation", () => {
  it("places a correction's excerpts over the text, in reading order, with their sub-skill and reason", () => {
    const result = assembleTranslation(asks(), correctionDraft());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { translation } = result;
    expect(translation.source).toBe("fr");
    expect(translation.target).toBe("fr");
    expect(translation.corrections.map((c) => FRENCH.slice(c.start, c.end))).toEqual(["au réunion", "rédigé"]);
    expect(translation.corrections.map((c) => c.subSkill)).toEqual(["prepositions-and-government", "agreement"]);
    expect(translation.corrections[1]?.why).toBe("The direct object comes first.");
    expect(translationSchema.safeParse(translation).success).toBe(true);
  });

  it("places a repeated phrase at its next occurrence, as writing feedback does", () => {
    const text = "le rapport et le rapport";
    const draft = correctionDraft({
      output: "le rapport et ce rapport",
      corrections: [
        { excerpt: "le rapport", correction: "ce rapport", why: "x", subSkill: "word-choice-precision" },
        { excerpt: "le rapport", correction: "ce rapport", why: "y", subSkill: "word-choice-precision" },
      ],
    });
    const result = assembleTranslation(asks({ text }), draft);
    expect(result.ok && result.translation.corrections.map((c) => c.start)).toEqual([0, 14]);
  });

  it("accepts a correction with no corrections: the French may already be right", () => {
    const result = assembleTranslation(asks(), correctionDraft({ corrections: [], output: FRENCH }));
    expect(result.ok && result.translation.corrections).toEqual([]);
  });

  it("keeps a translation's notes and returns it in the target language", () => {
    const result = assembleTranslation(asks({ text: "Treasury Board approved the submission.", source: "en" }), translationDraft());
    expect(result.ok && result.translation).toEqual({ ...translationDraft(), corrections: [], target: "fr" });
  });

  it("refuses an answer that reads the text as another language than the user said", () => {
    expect(assembleTranslation(asks({ source: "en" }), correctionDraft())).toEqual({
      ok: false,
      problem: 'the text is in "en", not "fr"',
    });
  });

  it("refuses an excerpt that is not in the text, or is blank", () => {
    const missing = correctionDraft({
      corrections: [{ excerpt: "le comité", correction: "la comité", why: "x", subSkill: "agreement" }],
    });
    expect(assembleTranslation(asks(), missing)).toEqual({ ok: false, problem: 'correction 0: "le comité" is not in the text' });
    const blank = correctionDraft({ corrections: [{ excerpt: "  ", correction: "x", why: "x", subSkill: "agreement" }] });
    expect(assembleTranslation(asks(), blank)).toEqual({ ok: false, problem: "correction 0: the excerpt is empty" });
  });

  it("refuses two corrections on the same words", () => {
    const twice = correctionDraft({
      corrections: [
        { excerpt: "au réunion", correction: "à la réunion", why: "x", subSkill: "agreement" },
        { excerpt: "réunion", correction: "séance", why: "y", subSkill: "word-choice-precision" },
      ],
    });
    const result = assembleTranslation(asks(), twice);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toMatch(/overlap/);
  });

  it("refuses notes on a correction, and strengths or corrections on a translation", () => {
    expect(assembleTranslation(asks(), correctionDraft({ notes: translationDraft().notes }))).toEqual({
      ok: false,
      problem: "a correction has no translation notes",
    });
    const english = asks({ text: "The report is attached.", source: "en" });
    expect(assembleTranslation(english, translationDraft({ strengths: ["Clear."] }))).toEqual({
      ok: false,
      problem: "a translation has no strengths to report",
    });
    const placed = translationDraft({
      corrections: [{ excerpt: "report", correction: "rapport", why: "x", subSkill: "word-choice-precision" }],
    });
    expect(assembleTranslation(english, placed)).toEqual({ ok: false, problem: "a translation has no corrections to place" });
  });
});

describe("checkTranslation", () => {
  const read: Translation = { ...translationDraft(), corrections: [], target: "fr" };

  it("passes a translation read back, and refuses a correction whose ranges no longer fit its text", () => {
    expect(checkTranslation("Treasury Board approved it.", read)).toBeNull();
    const correction: Translation = {
      source: "fr",
      target: "fr",
      output: "x",
      strengths: [],
      corrections: [{ start: 0, end: 99, correction: "x", why: "y", subSkill: "agreement" }],
      notes: [],
    };
    expect(checkTranslation("court", correction)).toMatch(/not a range inside/);
  });
});

describe("translationDraftSchema", () => {
  it("accepts both shapes of answer", () => {
    expect(translationDraftSchema.safeParse(correctionDraft()).success).toBe(true);
    expect(translationDraftSchema.safeParse(translationDraft()).success).toBe(true);
  });

  it("refuses a correction on a reading sub-skill, a blank output, or too many strengths", () => {
    const reading = { ...correctionDraft(), corrections: [{ excerpt: "a", correction: "b", why: "c", subSkill: "main-idea" }] };
    expect(translationDraftSchema.safeParse(reading).success).toBe(false);
    expect(translationDraftSchema.safeParse({ ...correctionDraft(), output: "  " }).success).toBe(false);
    expect(translationDraftSchema.safeParse({ ...correctionDraft(), strengths: ["a", "b", "c", "d", "e"] }).success).toBe(false);
  });

  it("refuses a link or any field it does not name: a model never writes the resources (D248)", () => {
    const linked = { ...correctionDraft(), resources: ["https://example.com"] };
    expect(translationDraftSchema.safeParse(linked).success).toBe(false);
  });
});
