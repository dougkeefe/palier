import type { Pointer } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { pickPointer } from "./pointer";

const pointer = (id: string, subSkill: Pointer["subSkill"]): Pointer => ({
  id,
  subSkill,
  lang: "fr",
  text: `${id} : _exemple_.`,
});

const POINTERS: readonly Pointer[] = [
  pointer("agreement-1", "agreement"),
  pointer("agreement-2", "agreement"),
  pointer("pronouns-1", "pronouns"),
  pointer("pronouns-2", "pronouns"),
  pointer("punctuation-1", "punctuation-and-mechanics"),
];

const DAY = "2026-10-06";
const NEXT = "2026-10-07";
const DAYS = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];

describe("pickPointer", () => {
  it("draws from the grammar points the writing plan favours", () => {
    for (const day of DAYS) {
      expect(pickPointer(POINTERS, { focusSubSkills: ["pronouns"], day })?.subSkill).toBe("pronouns");
    }
  });

  it("draws from every pointer when the focus holds no grammar point, such as a reading sub-skill", () => {
    const seen = new Set(DAYS.map((day) => pickPointer(POINTERS, { focusSubSkills: ["inference", "main-idea"], day })?.id));
    expect(seen).toEqual(new Set(POINTERS.map((p) => p.id)));
  });

  it("draws from every pointer when there is no focus yet", () => {
    expect(pickPointer(POINTERS, { focusSubSkills: [], day: DAY })).not.toBeNull();
  });

  it("is the same pointer all day, and the next one the next day", () => {
    const today = pickPointer(POINTERS, { focusSubSkills: ["agreement"], day: DAY });
    expect(pickPointer(POINTERS, { focusSubSkills: ["agreement"], day: DAY })).toBe(today);
    expect(pickPointer(POINTERS, { focusSubSkills: ["agreement"], day: NEXT })?.id).not.toBe(today?.id);
  });

  it("returns null for an empty set", () => {
    expect(pickPointer([], { focusSubSkills: [], day: DAY })).toBeNull();
  });
});
