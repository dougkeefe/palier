import { describe, expect, it } from "vitest";

import { draftsFor, generationCompletions, verdictFor } from "./openai-generation.js";

const PROMPT =
  'Produce 3 item(s) of type "cloze", sub-skill "pronouns", band B, topic "procurement". Reply with JSON.';

describe("the scripted generation completions (D110)", () => {
  it("drafts what the prompt asked for: the count, the type, the sub-skill, the band and the topic", () => {
    const { items } = draftsFor(PROMPT, "MARK");

    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toMatchObject({ type: "cloze", blankIndex: 0, subSkill: "pronouns", targetBand: "B", topic: "procurement", key: "a" });
      expect(item.stem.fr).toContain("MARK");
    }
  });

  it("gives no blank to a type that has none, and falls back when the prompt says nothing", () => {
    const [item] = draftsFor("", "M").items;

    expect(item).toMatchObject({ type: "error-id", subSkill: "agreement", targetBand: "C", topic: "finance-and-budgets" });
    expect(item).not.toHaveProperty("blankIndex");
  });

  it("reviews honestly: it finds the RIGHT option wherever the key was moved", () => {
    const review = "Item type \"cloze\", sub-skill \"pronouns\", intended band B, language fr.\nOptions:\na) wrong 1 b\nb) wrong 1 c\nc) RIGHT 1\nd) wrong 1 d";

    expect(verdictFor(review)).toMatchObject({ chosenKey: "c", estimatedBand: "B", confidence: 0.93, defensibleDistractors: [] });
  });

  it("scripts one draft and then reviews that repeat", () => {
    const [draft, review] = generationCompletions("X");

    expect(typeof draft?.content).toBe("function");
    expect(review?.content).toBe(verdictFor);
  });
});
