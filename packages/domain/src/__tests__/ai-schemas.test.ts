import { describe, expect, it } from "vitest";

import { itemDraftSchema, passageDraftSchema, reviewVerdictSchema } from "../schemas/ai.js";

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
