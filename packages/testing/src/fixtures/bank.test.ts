import {
  ITEM_TYPES,
  OPTION_IDS,
  SUB_SKILLS_BY_SKILL,
  examFormSchema,
  itemSchema,
  itemTypeDefinition,
  oralScenarioSchema,
  passageSchema,
} from "@palier/domain";
import { describe, expect, it } from "vitest";

import { FIXTURE_BANK, fixtureBankRepository } from "./bank.js";

const items = FIXTURE_BANK.items ?? [];
const passages = FIXTURE_BANK.passages ?? [];
const forms = FIXTURE_BANK.forms ?? [];
const scenarios = FIXTURE_BANK.scenarios ?? [];

describe("the canonical fixture bank", () => {
  it("holds exactly sixty items", () => {
    expect(items.length).toBe(60);
  });

  it("has every item pass the item schema", () => {
    const invalid = items.filter((item) => !itemSchema.safeParse(item).success);
    expect(invalid.map((item) => item.id)).toEqual([]);
  });

  it("has every item report zero registry validation issues", () => {
    const withIssues = items.filter(
      (item) => itemTypeDefinition(item.type).validate(item).length > 0,
    );
    expect(withIssues.map((item) => item.id)).toEqual([]);
  });

  it("covers every reading and writing sub-skill in the taxonomy", () => {
    const present = new Set(items.map((item) => item.subSkill));
    const scored = [...SUB_SKILLS_BY_SKILL.reading, ...SUB_SKILLS_BY_SKILL.writing];
    const missing = scored.filter((subSkill) => !present.has(subSkill));
    expect(missing).toEqual([]);
  });

  it("uses each of the four option keys as a correct answer", () => {
    const keys = new Set(items.map((item) => item.key));
    expect([...keys].sort()).toEqual([...OPTION_IDS].sort());
  });

  it("uses all four item types", () => {
    const types = new Set(items.map((item) => item.type));
    expect([...types].sort()).toEqual([...ITEM_TYPES].sort());
  });

  it("resolves every comprehension item's passage within the bank", () => {
    const passageIds = new Set(passages.map((passage) => passage.id));
    const dangling = items
      .filter((item) => item.type === "comprehension")
      .filter((item) => item.passageId === undefined || !passageIds.has(item.passageId));
    expect(dangling.map((item) => item.id)).toEqual([]);
  });

  it("resolves every exam form's item ids within the bank", () => {
    const itemIds = new Set(items.map((item) => item.id));
    const dangling = forms.flatMap((form) => form.itemIds).filter((id) => !itemIds.has(id));
    expect(dangling).toEqual([]);
  });

  it("has every passage pass the passage schema", () => {
    const invalid = passages.filter((passage) => !passageSchema.safeParse(passage).success);
    expect(invalid.map((passage) => passage.id)).toEqual([]);
  });

  it("has every exam form pass the exam-form schema", () => {
    const invalid = forms.filter((form) => !examFormSchema.safeParse(form).success);
    expect(invalid.map((form) => form.id)).toEqual([]);
  });

  it("has every oral scenario pass the oral-scenario schema", () => {
    const invalid = scenarios.filter(
      (scenario) => !oralScenarioSchema.safeParse(scenario).success,
    );
    expect(invalid.map((scenario) => scenario.id)).toEqual([]);
  });
});

describe("fixtureBankRepository", () => {
  it("serves only reading items for a reading query", async () => {
    const repo = fixtureBankRepository();
    const reading = await repo.query({ skill: "reading" });
    expect(reading.length).toBeGreaterThan(0);
    expect(reading.every((item) => item.skill === "reading")).toBe(true);
  });

  it("returns an item by its id", async () => {
    const repo = fixtureBankRepository();
    const first = items[0];
    const got = await repo.byIds(first ? [first.id] : []);
    expect(got).toEqual(first ? [first] : []);
  });

  it("reports the bank version it was seeded with", async () => {
    const repo = fixtureBankRepository();
    expect(await repo.bankVersion()).toBe(FIXTURE_BANK.bankVersion);
  });
});
