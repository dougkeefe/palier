import { describe, expect, it } from "vitest";

import type { Attempt, Item, SubSkill } from "@palier/domain";
import { itemId } from "@palier/domain";

import { subSkillBreakdown } from "./sub-skill-breakdown.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/** `n` attempts on one sub-skill, the first `correct` right. */
const on = (subSkill: SubSkill, n: number, correct: number, skill: Item["skill"] = "reading") => {
  const items: Item[] = [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < n; i += 1) {
    const id = itemId(`it-${skill}-${subSkill}-${i}`);
    items.push(anItem({ id, subSkill, skill }));
    attempts.push(anAttempt({ itemId: id, skill, correct: i < correct }));
  }
  return { items, attempts };
};

const merge = (...parts: { items: Item[]; attempts: Attempt[] }[]) => ({
  items: parts.flatMap((p) => p.items),
  attempts: parts.flatMap((p) => p.attempts),
});

describe("subSkillBreakdown", () => {
  it("counts every attempt per sub-skill, weakest first", () => {
    const { items, attempts } = merge(on("main-idea", 4, 3), on("inference", 5, 1), on("specific-detail", 2, 2));
    expect(subSkillBreakdown("reading", attempts, items)).toEqual([
      { subSkill: "inference", attempted: 5, correct: 1 },
      { subSkill: "main-idea", attempted: 4, correct: 3 },
      { subSkill: "specific-detail", attempted: 2, correct: 2 },
    ]);
  });

  it("has no window and no minimum: one answer counts, and so does the thousandth", () => {
    const { items, attempts } = merge(on("main-idea", 1, 0), on("inference", 120, 60));
    const tallies = subSkillBreakdown("reading", attempts, items);
    expect(tallies.find((t) => t.subSkill === "main-idea")).toEqual({ subSkill: "main-idea", attempted: 1, correct: 0 });
    expect(tallies.find((t) => t.subSkill === "inference")?.attempted).toBe(120);
  });

  it("breaks an accuracy tie by more evidence first, then by name", () => {
    const { items, attempts } = merge(on("tone-and-intent", 2, 1), on("inference", 4, 2), on("main-idea", 2, 1));
    expect(subSkillBreakdown("reading", attempts, items).map((t) => t.subSkill)).toEqual([
      "inference",
      "main-idea",
      "tone-and-intent",
    ]);
  });

  it("counts only the requested skill", () => {
    const { items, attempts } = merge(on("main-idea", 3, 1), on("agreement", 3, 3, "writing"));
    expect(subSkillBreakdown("writing", attempts, items)).toEqual([{ subSkill: "agreement", attempted: 3, correct: 3 }]);
  });

  it("drops an attempt whose item is no longer in the bank, rather than guess its sub-skill", () => {
    const { items, attempts } = on("main-idea", 3, 2);
    expect(subSkillBreakdown("reading", attempts, items.slice(1))).toEqual([
      { subSkill: "main-idea", attempted: 2, correct: 1 },
    ]);
  });

  it("is empty with no attempts", () => {
    expect(subSkillBreakdown("reading", [], [])).toEqual([]);
  });
});
