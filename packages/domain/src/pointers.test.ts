import { describe, expect, it } from "vitest";

import { parsePointers, parsePointersOrThrow } from "./pointers.js";
import { WRITING_SUB_SKILLS } from "./sub-skills.js";

const aPointer = (subSkill: string, over: Record<string, unknown> = {}) => ({
  id: `${subSkill}-1`,
  subSkill,
  lang: "fr",
  text: "_Leur_ devant un verbe ne prend jamais de s : _Je leur ai écrit._",
  ...over,
});

const everySubSkill = () => WRITING_SUB_SKILLS.map((subSkill) => aPointer(subSkill));

describe("parsePointers", () => {
  it("accepts a pointer for every written-expression sub-skill", () => {
    const result = parsePointers(everySubSkill());
    expect(result.ok && result.pointers.map((p) => p.subSkill)).toEqual([...WRITING_SUB_SKILLS]);
  });

  it("refuses a set missing a sub-skill, since Today could have nothing to show for it", () => {
    expect(parsePointers(everySubSkill().slice(1))).toEqual({
      ok: false,
      errors: [`(root): "${WRITING_SUB_SKILLS[0]}" has no pointer`],
    });
  });

  it("refuses an id used twice", () => {
    const result = parsePointers([...everySubSkill(), aPointer("agreement")]);
    expect(result).toEqual({ ok: false, errors: [`${String(WRITING_SUB_SKILLS.length)}.id: "agreement-1" is used twice`] });
  });

  it("refuses an unpaired example marker, since it would italicise the rest", () => {
    const pointers = everySubSkill().map((p) => (p.subSkill === "pronouns" ? aPointer("pronouns", { text: "Employez _leur." }) : p));
    expect(parsePointers(pointers)).toEqual({
      ok: false,
      errors: [`${String(WRITING_SUB_SKILLS.indexOf("pronouns"))}.text: an unpaired "_"`],
    });
  });

  it("refuses a reading or an oral sub-skill: a pointer is a grammar point (D218)", () => {
    expect(parsePointers([...everySubSkill(), aPointer("main-idea", { id: "reading" })]).ok).toBe(false);
    expect(parsePointers([...everySubSkill(), aPointer("fluency-and-hesitation", { id: "oral" })]).ok).toBe(false);
  });

  it("refuses a pointer written in two languages, or in none", () => {
    expect(parsePointers([...everySubSkill(), aPointer("agreement", { id: "two", text: { en: "x", fr: "x" } })]).ok).toBe(false);
    expect(parsePointers([...everySubSkill(), aPointer("agreement", { id: "blank", text: "  " })]).ok).toBe(false);
  });

  it("throws with every error named, for the composition root", () => {
    expect(() => parsePointersOrThrow([])).toThrow(/"verb-tense-and-mood" has no pointer/);
    expect(parsePointersOrThrow(everySubSkill())).toHaveLength(WRITING_SUB_SKILLS.length);
  });
});
