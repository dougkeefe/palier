import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseExamProfileOrThrow } from "@palier/domain";
import type { ExamForm, ExamProfile, Item, ItemOption } from "@palier/domain";

import { checkForms, perItemReasons, validateBank } from "./validate.js";

const profile: ExamProfile = parseExamProfileOrThrow(
  JSON.parse(readFileSync("content/profiles/psc-sle.json", "utf8")) as unknown,
);

const BAND_B_STEM = "administration coordination le chat va au parc vite ici bas";

const opt = (id: "a" | "b" | "c" | "d", text: string, rationaleFr = `parce que ${id}`): ItemOption => ({
  id,
  text,
  rationale: { fr: rationaleFr, en: `because ${id}` },
});

const item = (over: Partial<Item> = {}): Item => ({
  id: "I1" as Item["id"],
  version: 1,
  skill: "writing",
  lang: "fr",
  type: "cloze",
  stem: { fr: BAND_B_STEM, en: `EN ${BAND_B_STEM}` },
  blankIndex: 0,
  options: [opt("a", "alpha"), opt("b", "beta"), opt("c", "gamma"), opt("d", "delta")],
  key: "a",
  explanation: { fr: "la regle", en: "the rule" },
  subSkill: "agreement",
  targetBand: "B",
  topic: "human-resources",
  tags: [],
  provenance: { origin: "authored" },
  status: "published",
  createdAt: "2026-09-21T00:00:00.000Z",
  updatedAt: "2026-09-21T00:00:00.000Z",
  ...over,
});

describe("perItemReasons", () => {
  it("passes a well-formed item", () => {
    expect(perItemReasons(item(), profile)).toEqual([]);
  });

  it("flags a schema/option-count failure", () => {
    expect(perItemReasons(item({ options: [opt("a", "alpha")] }), profile).length).toBeGreaterThan(0);
  });

  it("flags two options sharing text", () => {
    const reasons = perItemReasons(item({ options: [opt("a", "same"), opt("b", "same"), opt("c", "c"), opt("d", "d")] }), profile);
    expect(reasons.join(" ")).toMatch(/share the same text/);
  });

  it("flags a sub-skill outside the profile taxonomy", () => {
    expect(perItemReasons(item({ subSkill: "main-idea" }), profile).join(" ")).toMatch(/not in the profile taxonomy/);
  });

  it("flags the answer leaked in the stem", () => {
    const leaked = item({ stem: { fr: `${BAND_B_STEM} alpha`, en: "en" }, options: [opt("a", "alpha"), opt("b", "beta"), opt("c", "gamma"), opt("d", "delta")] });
    expect(perItemReasons(leaked, profile).join(" ")).toMatch(/answer leaked/);
  });

  it("flags a distractor rationale that asserts it is correct", () => {
    const bad = item({ options: [opt("a", "alpha"), opt("b", "beta", "c'est la bonne reponse"), opt("c", "gamma"), opt("d", "delta")] });
    expect(perItemReasons(bad, profile).join(" ")).toMatch(/contradiction/);
  });

  it("flags a reading level far from the band tag", () => {
    const simple = item({ stem: { fr: "le chat va au parc vite", en: "en" }, targetBand: "C" });
    expect(perItemReasons(simple, profile).join(" ")).toMatch(/reading level/);
  });
});

describe("validateBank", () => {
  it("accepts distinct items and keeps the key distribution ok", () => {
    const report = validateBank([item({ id: "A" as Item["id"] })], [], profile);
    expect(report.valid).toHaveLength(1);
    expect(report.keyDistributionOk).toBe(true);
  });

  it("rejects a near-duplicate of an accepted item", () => {
    const a = item({ id: "A" as Item["id"] });
    const b = item({ id: "B" as Item["id"] });
    const report = validateBank([a, b], [], profile);
    expect(report.valid).toHaveLength(1);
    expect(report.nearDuplicates).toHaveLength(1);
  });

  it("flags a stuck key distribution once the bank is large enough", () => {
    const many = Array.from({ length: 8 }, (_, i) => item({ id: `K${String(i)}` as Item["id"], stem: { fr: `mot${String(i)}a mot${String(i)}b mot${String(i)}c administration`, en: "en" }, key: "a" }));
    const report = validateBank(many, [], profile);
    expect(report.keyDistributionOk).toBe(false);
  });
});

describe("checkForms", () => {
  const form = (over: Partial<ExamForm>): ExamForm => ({
    id: "F1" as ExamForm["id"],
    skill: "reading",
    lang: "fr",
    mode: "supervised",
    itemIds: ["A" as Item["id"]],
    pilotItemIds: [],
    timeLimitMinutes: 90,
    bandCuts: [{ band: "C", min: 0, max: 1 }],
    version: 1,
    ...over,
  });

  it("flags a form referencing a missing item", () => {
    expect(checkForms([form({})], [], profile).join(" ")).toMatch(/missing item/);
  });

  it("flags a form whose item count does not match its variant", () => {
    const it0 = item({ id: "A" as Item["id"] });
    expect(checkForms([form({ itemIds: [it0.id] })], [it0], profile).join(" ")).toMatch(/requires/);
  });
});
