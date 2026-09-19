import { describe, expect, it } from "vitest";

import { SKILLS } from "./skills.js";
import {
  ALL_SUB_SKILLS,
  ORAL_SUB_SKILLS,
  READING_SUB_SKILLS,
  WRITING_SUB_SKILLS,
  subSkillsFor,
} from "./sub-skills.js";

describe("the sub-skill taxonomy", () => {
  it("has the counts published in product-requirements.md 13.2", () => {
    expect({
      reading: READING_SUB_SKILLS.length,
      writing: WRITING_SUB_SKILLS.length,
      oral: ORAL_SUB_SKILLS.length,
    }).toEqual({ reading: 8, writing: 10, oral: 8 });
  });

  it("names no sub-skill twice, even across skills", () => {
    expect(new Set(ALL_SUB_SKILLS).size).toBe(ALL_SUB_SKILLS.length);
  });

  it("covers every skill", () => {
    expect(SKILLS.every((skill) => subSkillsFor(skill).length > 0)).toBe(true);
  });

  it("returns the reading taxonomy for reading", () => {
    expect(subSkillsFor("reading")).toEqual(READING_SUB_SKILLS);
  });

  it("returns the writing taxonomy for writing", () => {
    expect(subSkillsFor("writing")).toEqual(WRITING_SUB_SKILLS);
  });

  it("returns the oral taxonomy for oral", () => {
    expect(subSkillsFor("oral")).toEqual(ORAL_SUB_SKILLS);
  });
});
