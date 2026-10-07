import type { Pointer } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { pickPointer } from "./pointer";

const pointer = (id: string, subSkill: Pointer["subSkill"]): Pointer => ({
  id,
  subSkill,
  lang: "fr",
  text: { en: `${id} in English`, fr: `${id} en français` },
});

const POINTERS: readonly Pointer[] = [
  pointer("main-1", "main-idea"),
  pointer("main-2", "main-idea"),
  pointer("inference-1", "inference"),
  pointer("agreement-1", "agreement"),
  pointer("agreement-2", "agreement"),
  pointer("pronouns-1", "pronouns"),
];

const DAY = "2026-10-06";
const NEXT = "2026-10-07";

describe("pickPointer", () => {
  it("draws from the focus sub-skills at the skill being looked at", () => {
    for (const day of [DAY, NEXT, "2026-10-08"]) {
      expect(pickPointer(POINTERS, { skill: "writing", focusSubSkills: ["agreement"], day })?.subSkill).toBe("agreement");
    }
  });

  it("ignores focus at the other skill, and falls back to any sub-skill of this one", () => {
    const picked = pickPointer(POINTERS, { skill: "reading", focusSubSkills: ["agreement", "fluency-and-hesitation"], day: DAY });
    expect(["main-idea", "inference"]).toContain(picked?.subSkill);
  });

  it("draws from the whole skill when there is no focus yet", () => {
    const seen = new Set(
      ["2026-10-06", "2026-10-07", "2026-10-08"].map((day) => pickPointer(POINTERS, { skill: "reading", focusSubSkills: [], day })?.id),
    );
    expect(seen).toEqual(new Set(["main-1", "main-2", "inference-1"]));
  });

  it("is the same pointer all day, and the next one the next day", () => {
    const request = { skill: "writing", focusSubSkills: ["agreement"] } as const;
    const today = pickPointer(POINTERS, { ...request, day: DAY });
    expect(pickPointer(POINTERS, { ...request, day: DAY })).toBe(today);
    expect(pickPointer(POINTERS, { ...request, day: NEXT })?.id).not.toBe(today?.id);
  });

  it("returns null when the set holds nothing for the skill", () => {
    expect(pickPointer(POINTERS.slice(0, 3), { skill: "writing", focusSubSkills: [], day: DAY })).toBeNull();
  });
});
