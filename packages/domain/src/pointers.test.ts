import { describe, expect, it } from "vitest";

import { parsePointers, parsePointersOrThrow } from "./pointers.js";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "./sub-skills.js";

const SCORED = [...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS];

const aPointer = (subSkill: string, over: Record<string, unknown> = {}) => ({
  id: `${subSkill}-1`,
  subSkill,
  lang: "fr",
  text: { en: "Watch _leur_ before a verb.", fr: "Surveillez _leur_ devant un verbe." },
  ...over,
});

const everySubSkill = () => SCORED.map((subSkill) => aPointer(subSkill));

describe("parsePointers", () => {
  it("accepts a pointer for every reading and written-expression sub-skill", () => {
    const result = parsePointers(everySubSkill());
    expect(result.ok && result.pointers.map((p) => p.subSkill)).toEqual(SCORED);
  });

  it("refuses a set missing a sub-skill, since Today could have nothing to show for it", () => {
    expect(parsePointers(everySubSkill().slice(1))).toEqual({
      ok: false,
      errors: [`(root): "${SCORED[0]}" has no pointer`],
    });
  });

  it("refuses an id used twice", () => {
    const result = parsePointers([...everySubSkill(), aPointer("agreement")]);
    expect(result).toEqual({ ok: false, errors: [`${String(SCORED.length)}.id: "agreement-1" is used twice`] });
  });

  it("refuses an unpaired cited-text marker in either language", () => {
    const pointers = everySubSkill().map((p) =>
      p.subSkill === "pronouns" ? aPointer("pronouns", { text: { en: "Use _leur.", fr: "Employez _leur_." } }) : p,
    );
    expect(parsePointers(pointers)).toEqual({
      ok: false,
      errors: [`${String(SCORED.indexOf("pronouns"))}.text.en: an unpaired "_"`],
    });
  });

  it("refuses an oral sub-skill, which no drill practises", () => {
    expect(parsePointers([...everySubSkill(), aPointer("fluency-and-hesitation", { id: "oral" })]).ok).toBe(false);
  });

  it("refuses advice missing a language", () => {
    const pointers = everySubSkill().map((p) => (p.subSkill === "inference" ? { ...p, text: { en: "Only" } } : p));
    expect(parsePointers(pointers).ok).toBe(false);
  });

  it("throws with every error named, for the composition root", () => {
    expect(() => parsePointersOrThrow([])).toThrow(/"main-idea" has no pointer/);
    expect(parsePointersOrThrow(everySubSkill())).toHaveLength(SCORED.length);
  });
});
