import { describe, expect, it } from "vitest";

import {
  attemptSchema,
  examFormSchema,
  itemSchema,
  oralScenarioSchema,
  passageSchema,
  writingPromptSchema,
} from "../index.js";
import {
  aValidAttempt,
  aValidExamForm,
  aValidItem,
  aValidOralScenario,
  aValidPassage,
} from "./fixtures.js";

/**
 * "Each accepts a valid artefact and rejects each specific way of being
 * invalid, one test per rejection reason. These tests are what the content
 * suite's error messages depend on being accurate."
 * (implementation-plan.md 6.2, tier 1)
 */

const reasons = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  (result.error?.issues ?? []).map((i) => i.message).join(" | ");

describe("itemSchema", () => {
  it("accepts a valid item", () => {
    expect(itemSchema.safeParse(aValidItem()).success).toBe(true);
  });

  it("rejects a key naming an option that does not exist", () => {
    const result = itemSchema.safeParse(aValidItem({ key: "d", options: [
      { id: "a", text: "x", rationale: { en: "e", fr: "f" } },
    ] }));
    expect(reasons(result)).toMatch(/no option has that id/);
  });

  it("rejects two options sharing an id", () => {
    const result = itemSchema.safeParse(
      aValidItem({
        options: [
          { id: "a", text: "x", rationale: { en: "e", fr: "f" } },
          { id: "a", text: "y", rationale: { en: "e", fr: "f" } },
        ],
      }),
    );
    expect(reasons(result)).toMatch(/share an id/);
  });

  it("rejects an option with no rationale [R7]", () => {
    const item = aValidItem();
    const broken = { ...item, options: [{ id: "a", text: "x" }] };
    expect(itemSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a rationale missing the French locale [R8]", () => {
    const item = aValidItem();
    const broken = {
      ...item,
      options: [{ id: "a", text: "x", rationale: { en: "only english" } }],
      key: "a",
    };
    expect(itemSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects an empty rationale string, which passes a key check but helps nobody", () => {
    const item = aValidItem();
    const broken = {
      ...item,
      options: [{ id: "a", text: "x", rationale: { en: "", fr: "" } }],
      key: "a",
    };
    expect(itemSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a missing explanation [R7]", () => {
    const { explanation: _dropped, ...rest } = aValidItem();
    expect(itemSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a comprehension item with no passage", () => {
    const result = itemSchema.safeParse(aValidItem({ type: "comprehension" }));
    expect(reasons(result)).toMatch(/must name the passage/);
  });

  it("rejects a blankIndex on an item type that has no blank", () => {
    const result = itemSchema.safeParse(
      aValidItem({ type: "error-id", blankIndex: 2 }),
    );
    expect(reasons(result)).toMatch(/only a cloze item has/);
  });

  it("rejects a sub-skill outside the taxonomy", () => {
    expect(
      itemSchema.safeParse({ ...aValidItem(), subSkill: "vibes" }).success,
    ).toBe(false);
  });

  it("rejects a topic outside the taxonomy", () => {
    expect(itemSchema.safeParse({ ...aValidItem(), topic: "sport" }).success).toBe(false);
  });

  it("rejects a target band of X, which describes no item", () => {
    expect(itemSchema.safeParse({ ...aValidItem(), targetBand: "X" }).success).toBe(false);
  });

  it("rejects oral as an item skill, since oral has no multiple-choice items", () => {
    expect(itemSchema.safeParse({ ...aValidItem(), skill: "oral" }).success).toBe(false);
  });

  it("rejects a proportionCorrect above 1", () => {
    const broken = aValidItem({
      stats: {
        responses: 100,
        proportionCorrect: 1.2,
        pointBiserial: 0.3,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(itemSchema.safeParse(broken).success).toBe(false);
  });

  it("accepts a negative pointBiserial, which is meaningful rather than invalid", () => {
    const flagged = aValidItem({
      stats: {
        responses: 100,
        proportionCorrect: 0.4,
        pointBiserial: -0.2,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(itemSchema.safeParse(flagged).success).toBe(true);
  });

  it("accepts statistics with no point-biserial, for an item with no correlation to compute", () => {
    const uniform = aValidItem({
      stats: { responses: 40, proportionCorrect: 1, pointBiserial: null, updatedAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(itemSchema.safeParse(uniform).success).toBe(true);
  });

  it("rejects a non-ISO timestamp", () => {
    expect(itemSchema.safeParse({ ...aValidItem(), createdAt: "yesterday" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown extra field rather than silently dropping it", () => {
    expect(
      itemSchema.safeParse({ ...aValidItem(), difficulty: 0.7 }).success,
    ).toBe(false);
  });

  it("accepts an authored item crediting its contributor by handle", () => {
    const credited = aValidItem({ provenance: { origin: "authored", contributor: "octo-cat42" } });
    expect(itemSchema.safeParse(credited).success).toBe(true);
  });

  it("accepts an authored item with no contributor, which validate() flags instead, so older banks stay valid", () => {
    expect(itemSchema.safeParse(aValidItem({ provenance: { origin: "authored" } })).success).toBe(true);
  });

  it.each([
    ["a full name, which is personal information", "Jean Tremblay"],
    ["an email address", "jean@example.ca"],
    ["a leading hyphen", "-octocat"],
    ["a trailing hyphen", "octocat-"],
    ["two hyphens in a row", "octo--cat"],
    ["the empty string", ""],
    ["more than 39 characters", "a".repeat(40)],
  ])("rejects a contributor that is not a handle: %s", (_name, contributor) => {
    const result = itemSchema.safeParse(aValidItem({ provenance: { origin: "authored", contributor } }));
    expect(result.success).toBe(false);
  });

  it("names the handle rule when it rejects a contributor", () => {
    const result = itemSchema.safeParse(aValidItem({ provenance: { origin: "authored", contributor: "Jean Tremblay" } }));
    expect(reasons(result)).toMatch(/public handle such as a GitHub username/);
  });

  it("accepts a 39-character handle, GitHub's longest", () => {
    const result = itemSchema.safeParse(aValidItem({ provenance: { origin: "authored", contributor: "a".repeat(39) } }));
    expect(result.success).toBe(true);
  });
});

describe("passageSchema", () => {
  it("accepts a valid original passage", () => {
    expect(passageSchema.safeParse(aValidPassage()).success).toBe(true);
  });

  it("rejects a derived passage with no licence", () => {
    const result = passageSchema.safeParse(
      aValidPassage({ source: { kind: "derived", url: "https://example.gc.ca/a" } }),
    );
    expect(reasons(result)).toMatch(/must record the licence/);
  });

  it("rejects a derived passage with no source url", () => {
    const result = passageSchema.safeParse(
      aValidPassage({ source: { kind: "derived", licence: "OGL-Canada-2.0" } }),
    );
    expect(reasons(result)).toMatch(/must record where it came from/);
  });

  it("rejects an unrecognised licence", () => {
    const broken = {
      ...aValidPassage(),
      source: { kind: "derived", url: "https://x.gc.ca", licence: "WTFPL" },
    };
    expect(passageSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a rareWordRatio above 1", () => {
    const broken = aValidPassage({
      readability: { sentences: 1, avgSentenceLength: 5, rareWordRatio: 1.5 },
    });
    expect(passageSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects an empty body", () => {
    expect(passageSchema.safeParse(aValidPassage({ body: "" })).success).toBe(false);
  });

  it("rejects a doc type outside the published list", () => {
    expect(
      passageSchema.safeParse({ ...aValidPassage(), docType: "tweet" }).success,
    ).toBe(false);
  });

  it("accepts a hand-authored passage crediting its contributor by handle", () => {
    const credited = aValidPassage({ source: { kind: "original", contributor: "octo-cat42" } });
    expect(passageSchema.safeParse(credited).success).toBe(true);
  });

  it("rejects a passage contributor that is not a handle", () => {
    const result = passageSchema.safeParse(aValidPassage({ source: { kind: "original", contributor: "jean@example.ca" } }));
    expect(reasons(result)).toMatch(/public handle such as a GitHub username/);
  });
});

describe("oralScenarioSchema", () => {
  it("accepts a valid scenario", () => {
    expect(oralScenarioSchema.safeParse(aValidOralScenario()).success).toBe(true);
  });

  it("rejects a scenario with no phases", () => {
    expect(oralScenarioSchema.safeParse(aValidOralScenario({ phases: [] })).success).toBe(
      false,
    );
  });

  it("rejects a phase with no seed question, which leaves the examiner nothing to open with", () => {
    const broken = aValidOralScenario({
      phases: [
        {
          name: "x",
          minutes: 1,
          intent: "y",
          seedQuestions: [],
          escalation: [],
          deescalation: [],
        },
      ],
    });
    expect(oralScenarioSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a target band of A, since oral scenarios are authored at B and C", () => {
    expect(
      oralScenarioSchema.safeParse({ ...aValidOralScenario(), targetBand: "A" }).success,
    ).toBe(false);
  });
});

describe("examFormSchema", () => {
  it("accepts a valid form", () => {
    expect(examFormSchema.safeParse(aValidExamForm()).success).toBe(true);
  });

  it("rejects a cut table that does not top out at the scored count", () => {
    const result = examFormSchema.safeParse(
      aValidExamForm({
        bandCuts: [
          { band: "X", min: 0, max: 8 },
          { band: "A", min: 9, max: 13 },
          { band: "B", min: 14, max: 18 },
          { band: "C", min: 19, max: 24 },
        ],
      }),
    );
    expect(reasons(result)).toMatch(/tops out at 24 but this form has 25 scored items/);
  });

  it("rejects a pilot item that is not on the form", () => {
    const result = examFormSchema.safeParse(
      aValidExamForm({ pilotItemIds: ["not-on-the-form"] as never }),
    );
    expect(reasons(result)).toMatch(/must also appear in itemIds/);
  });

  it("rejects the same item appearing twice", () => {
    const ids = Array.from({ length: 25 }, (_, i) => `item-${i}`);
    ids[24] = "item-0";
    const result = examFormSchema.safeParse(
      aValidExamForm({
        itemIds: ids as never,
        bandCuts: [
          { band: "X", min: 0, max: 8 },
          { band: "A", min: 9, max: 13 },
          { band: "B", min: 14, max: 18 },
          { band: "C", min: 19, max: 25 },
        ],
      }),
    );
    expect(reasons(result)).toMatch(/appears twice/);
  });

  it("accounts for pilot items when checking the cut table's ceiling", () => {
    // 27 administered, 2 pilot, so the table must end at 25.
    const ids = Array.from({ length: 27 }, (_, i) => `item-${i}`);
    const form = aValidExamForm({
      itemIds: ids as never,
      pilotItemIds: ["item-25", "item-26"] as never,
    });
    expect(examFormSchema.safeParse(form).success).toBe(true);
  });
});

describe("attemptSchema", () => {
  it("accepts a valid attempt", () => {
    expect(attemptSchema.safeParse(aValidAttempt()).success).toBe(true);
  });

  it("rejects a negative timing", () => {
    expect(
      attemptSchema.safeParse(aValidAttempt({ msToConfirm: -1 })).success,
    ).toBe(false);
  });

  it("rejects a chosen option outside a to d", () => {
    expect(
      attemptSchema.safeParse({ ...aValidAttempt(), chosen: "e" }).success,
    ).toBe(false);
  });

  it("rejects a mode outside the published list", () => {
    expect(
      attemptSchema.safeParse({ ...aValidAttempt(), mode: "practice" }).success,
    ).toBe(false);
  });
});

describe("writingPromptSchema", () => {
  const aValidPrompt = (over: Record<string, unknown> = {}) => ({
    id: "wp-briefing-01",
    lang: "fr",
    register: "briefing-note",
    title: { en: "A briefing note", fr: "Une note d'information" },
    task: "Rédigez un paragraphe de note d'information.",
    wordTarget: 150,
    suggestedMinutes: 20,
    ...over,
  });

  it("accepts a valid prompt", () => {
    expect(writingPromptSchema.safeParse(aValidPrompt()).success).toBe(true);
  });

  it("rejects a register the workshop does not offer", () => {
    expect(writingPromptSchema.safeParse(aValidPrompt({ register: "essay" })).success).toBe(false);
  });

  it("rejects a title missing a locale, since the picker reads in either", () => {
    expect(writingPromptSchema.safeParse(aValidPrompt({ title: { fr: "Seul" } })).success).toBe(false);
  });

  it("rejects a blank task", () => {
    expect(writingPromptSchema.safeParse(aValidPrompt({ task: "" })).success).toBe(false);
  });

  it("rejects a word target or suggested time that is not a positive whole number", () => {
    expect(writingPromptSchema.safeParse(aValidPrompt({ wordTarget: 0 })).success).toBe(false);
    expect(writingPromptSchema.safeParse(aValidPrompt({ suggestedMinutes: 2.5 })).success).toBe(false);
  });

  it("rejects a field it does not know", () => {
    expect(writingPromptSchema.safeParse(aValidPrompt({ targetBand: "C" })).success).toBe(false);
  });
});
