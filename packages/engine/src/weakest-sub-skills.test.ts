import { describe, expect, it } from "vitest";

import type { Attempt, Item, SubSkill } from "@palier/domain";
import { itemId } from "@palier/domain";

import {
  WEAKEST_COUNT,
  WEAKEST_MIN,
  WEAKEST_WINDOW,
  weakestSubSkills,
} from "./weakest-sub-skills.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * architecture.md §7.2:
 *   "Weakest sub-skill is accuracy over the last 50 attempts in that sub-skill,
 *    minimum 8 attempts to qualify."
 * The selector weights the three weakest at 3× (see selector.test.ts).
 */
const DAY = 24 * 60 * 60 * 1000;

/** `n` attempts on one reading sub-skill, the first `correct` right, dated in sequence. */
const on = (
  subSkill: SubSkill,
  n: number,
  correct: number,
  opts: { skill?: Item["skill"]; startDay?: number } = {},
): { items: Item[]; attempts: Attempt[] } => {
  const skill = opts.skill ?? "reading";
  const startDay = opts.startDay ?? 0;
  const items: Item[] = [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < n; i += 1) {
    const id = itemId(`it-${subSkill}-${startDay}-${i}`);
    items.push(anItem({ id, subSkill, skill }));
    attempts.push(
      anAttempt({ itemId: id, skill, correct: i < correct, ts: new Date((startDay + i) * DAY).toISOString() }),
    );
  }
  return { items, attempts };
};

const merge = (...parts: ReadonlyArray<{ items: Item[]; attempts: Attempt[] }>) => ({
  items: parts.flatMap((p) => p.items),
  attempts: parts.flatMap((p) => p.attempts),
});

describe("weakestSubSkills", () => {
  it("returns the three weakest qualifying sub-skills, weakest first", () => {
    const { items, attempts } = merge(
      on("main-idea", 10, 9), // 0.9
      on("inference", 10, 2), // 0.2  weakest
      on("tone-and-intent", 10, 5), // 0.5
      on("specific-detail", 10, 4), // 0.4
      on("text-structure", 10, 8), // 0.8
    );

    expect(weakestSubSkills("reading", attempts, items)).toEqual([
      "inference",
      "specific-detail",
      "tone-and-intent",
    ]);
  });

  it("ignores a sub-skill below the minimum number of attempts", () => {
    const { items, attempts } = merge(
      on("inference", WEAKEST_MIN - 1, 0), // 0% but too few to qualify
      on("main-idea", 8, 4),
      on("tone-and-intent", 8, 5),
    );

    expect(weakestSubSkills("reading", attempts, items)).not.toContain("inference");
  });

  it("qualifies a sub-skill at exactly the minimum", () => {
    const { items, attempts } = merge(on("inference", WEAKEST_MIN, 1));

    expect(weakestSubSkills("reading", attempts, items)).toContain("inference");
  });

  it("considers only the most recent attempts within the window", () => {
    // inference: 100 old misses, then 50 recent hits. Counting all it is 0.33 and
    // would be the weakest; over the last 50 only it is 1.0 and drops out entirely.
    const all = merge(
      on("inference", 100, 0, { startDay: 0 }),
      on("inference", WEAKEST_WINDOW, WEAKEST_WINDOW, { startDay: 200 }),
      on("main-idea", 10, 4, { startDay: 400 }),
      on("specific-detail", 10, 4, { startDay: 420 }),
      on("tone-and-intent", 10, 4, { startDay: 440 }),
    );

    expect(weakestSubSkills("reading", all.attempts, all.items)).toEqual([
      "main-idea",
      "specific-detail",
      "tone-and-intent",
    ]);
  });

  it("counts only attempts for the requested skill", () => {
    const readingWeak = on("inference", 10, 1, { skill: "reading" });
    const writingStrong = on("agreement", 10, 10, { skill: "writing", startDay: 100 });
    const { items, attempts } = merge(readingWeak, writingStrong);

    const weakest = weakestSubSkills("reading", attempts, items);
    expect(weakest).toEqual(["inference"]);
  });

  it("returns fewer than three when fewer qualify", () => {
    const { items, attempts } = merge(on("inference", 8, 2), on("main-idea", 8, 6));

    expect(weakestSubSkills("reading", attempts, items)).toHaveLength(2);
  });

  it("returns nothing when there is not enough evidence anywhere", () => {
    expect(weakestSubSkills("reading", [], [])).toEqual([]);
  });

  it("ignores an attempt whose item is not in the supplied bank", () => {
    const orphans = Array.from({ length: WEAKEST_MIN }, (_, i) =>
      anAttempt({ itemId: itemId(`ghost-${i}`), skill: "reading", correct: false }),
    );

    expect(weakestSubSkills("reading", orphans, [])).toEqual([]);
  });

  it("breaks ties deterministically by sub-skill name", () => {
    const { items, attempts } = merge(
      on("tone-and-intent", 10, 5),
      on("inference", 10, 5),
      on("main-idea", 10, 5),
      on("cohesion-and-reference", 10, 5),
    );

    // All 0.5; the three weakest are the first three alphabetically.
    expect(weakestSubSkills("reading", attempts, items)).toEqual([
      "cohesion-and-reference",
      "inference",
      "main-idea",
    ]);
  });

  it("never returns more than the configured count", () => {
    const { items, attempts } = merge(
      on("main-idea", 10, 1),
      on("inference", 10, 2),
      on("tone-and-intent", 10, 3),
      on("specific-detail", 10, 4),
      on("text-structure", 10, 5),
    );

    expect(weakestSubSkills("reading", attempts, items)).toHaveLength(WEAKEST_COUNT);
  });
});

/** Found by the one-off mutation check (progress.md D77): the per-sub-skill window's edge, exactly. */
describe("weakestSubSkills, the window's edge", () => {
  it("drops the one answer just outside the window", () => {
    // inference: one old miss, then exactly a window of hits, so it reads 1.0 only if the
    // miss is outside; cohesion-and-reference reads 1.0 too, and wins the name tie.
    const all = merge(
      on("inference", 1, 0, { startDay: 0 }),
      on("inference", WEAKEST_WINDOW, WEAKEST_WINDOW, { startDay: 10 }),
      on("cohesion-and-reference", WEAKEST_WINDOW, WEAKEST_WINDOW, { startDay: 100 }),
    );

    expect(weakestSubSkills("reading", all.attempts, all.items)).toEqual(["cohesion-and-reference", "inference"]);
  });
});
