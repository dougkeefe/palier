import { describe, expect, it } from "vitest";

import { itemId, passageId } from "../ids.js";
import type { Item } from "../item.js";
import { ITEM_TYPES } from "../skills.js";
import { aValidItem } from "../__tests__/fixtures.js";
import { ITEM_TYPE_DEFINITIONS, itemTypeDefinition } from "./registry.js";
import { scoreMcq } from "./scoring.js";
import {
  validateBestCompletion,
  validateCloze,
  validateCommon,
  validateComprehension,
  validateErrorId,
} from "./validation.js";
import {
  generateBestCompletionPrompt,
  generateClozePrompt,
  generateComprehensionPrompt,
  generateErrorIdPrompt,
} from "./prompts.js";
import type { PromptContext } from "./definition.js";

const aValidCloze = (over: Partial<Item> = {}): Item =>
  aValidItem({ type: "cloze", blankIndex: 2, ...over });

const aValidComprehension = (over: Partial<Item> = {}): Item =>
  aValidItem({ type: "comprehension", passageId: passageId("01HPASSAGE0000000000001"), ...over });

const threeOptions = [
  { id: "a", text: "un", rationale: { en: "A", fr: "A" } },
  { id: "b", text: "deux", rationale: { en: "B", fr: "B" } },
  { id: "c", text: "trois", rationale: { en: "C", fr: "C" } },
] as const;

describe("scoreMcq", () => {
  it("is correct when the response names the key", () => {
    expect(scoreMcq(aValidItem({ key: "a" }), "a")).toEqual({ correct: true });
  });

  it("is incorrect when the response is any other option", () => {
    expect(scoreMcq(aValidItem({ key: "a" }), "b")).toEqual({ correct: false });
  });
});

describe("validateCommon", () => {
  it("reports nothing for an item carrying all four options with a valid key", () => {
    expect(validateCommon(aValidItem())).toEqual([]);
  });

  it("flags an item missing one of the four options", () => {
    const issues = validateCommon(aValidItem({ options: threeOptions, key: "a" }));
    expect(issues.map((i) => i.code)).toContain("option-count");
  });

  it("flags an item with a duplicate option even when all four ids appear", () => {
    const withDuplicate = [
      ...aValidItem().options,
      { id: "a" as const, text: "encore", rationale: { en: "dup", fr: "dup" } },
    ];
    const issues = validateCommon(aValidItem({ options: withDuplicate }));
    expect(issues.map((i) => i.code)).toContain("option-count");
  });

  it("flags a key that names no option, carrying the offending id", () => {
    const issues = validateCommon(aValidItem({ options: threeOptions, key: "d" }));
    const keyIssue = issues.find((i) => i.code === "key-not-an-option");
    expect(keyIssue?.optionId).toBe("d");
  });
});

describe("validateCloze", () => {
  it("flags a cloze item with no blank index", () => {
    const codes = validateCloze(aValidItem({ type: "cloze" })).map((i) => i.code);
    expect(codes).toContain("cloze-missing-blank");
  });

  it("accepts a cloze item that marks its blank", () => {
    expect(validateCloze(aValidCloze())).toEqual([]);
  });
});

describe("validateComprehension", () => {
  it("flags a comprehension item that names no passage", () => {
    const codes = validateComprehension(aValidItem({ type: "comprehension" })).map((i) => i.code);
    expect(codes).toContain("comprehension-missing-passage");
  });

  it("accepts a comprehension item that names its passage", () => {
    expect(validateComprehension(aValidComprehension())).toEqual([]);
  });
});

describe("validate for types without a type-specific check", () => {
  it("error-id carries only the shared checks", () => {
    expect(validateErrorId(aValidItem({ type: "error-id" }))).toEqual([]);
  });

  it("best-completion carries only the shared checks", () => {
    expect(validateBestCompletion(aValidItem({ type: "best-completion" }))).toEqual([]);
  });
});

describe("generatePrompt", () => {
  const ctx: PromptContext = {
    targetBand: "C",
    subSkill: "verb-tense-and-mood",
    topic: "policy-and-legislation",
    lang: "fr",
  };

  it("carries the item type, the target band and non-empty instructions per type", () => {
    for (const [type, generate] of [
      ["cloze", generateClozePrompt],
      ["comprehension", generateComprehensionPrompt],
      ["error-id", generateErrorIdPrompt],
      ["best-completion", generateBestCompletionPrompt],
    ] as const) {
      const spec = generate(ctx);
      expect(spec.itemType).toBe(type);
      expect(spec.targetBand).toBe("C");
      expect(spec.instructions.length).toBeGreaterThan(0);
    }
  });
});

describe("per-type schema", () => {
  it("accepts an item of its own type and rejects any other", () => {
    const cloze = aValidCloze();
    const comprehension = aValidComprehension();
    expect(ITEM_TYPE_DEFINITIONS.cloze.schema.safeParse(cloze).success).toBe(true);
    expect(ITEM_TYPE_DEFINITIONS.cloze.schema.safeParse(comprehension).success).toBe(false);
    expect(ITEM_TYPE_DEFINITIONS.comprehension.schema.safeParse(comprehension).success).toBe(true);
    expect(ITEM_TYPE_DEFINITIONS["error-id"].schema.safeParse(aValidItem()).success).toBe(true);
    expect(
      ITEM_TYPE_DEFINITIONS["best-completion"].schema.safeParse(
        aValidItem({ type: "best-completion", id: itemId("01HITEM00000000000000002") }),
      ).success,
    ).toBe(true);
  });
});

describe("itemTypeDefinition", () => {
  it("returns the definition registered for each item type", () => {
    for (const type of ITEM_TYPES) {
      expect(itemTypeDefinition(type)).toBe(ITEM_TYPE_DEFINITIONS[type]);
    }
  });
});
