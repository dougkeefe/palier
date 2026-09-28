import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Attempt, Item } from "@palier/domain";
import { READING_SUB_SKILLS, itemId } from "@palier/domain";

import { SHORTEN_FACTOR, TAPER_DAYS, planDay } from "./planner.js";
import { anItem } from "./__tests__/fixtures.js";

/**
 * implementation-plan.md §6.2, tier 2, planner invariants:
 *   the day never exceeds its budget, the three buckets never overlap, tapering
 *   suppresses new items, and an incomplete yesterday never lengthens today.
 */
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = "2026-06-01T00:00:00.000Z";

const spec = fc.record({
  subSkill: fc.constantFrom(...READING_SUB_SKILLS),
  targetBand: fc.constantFrom("A" as const, "B" as const, "C" as const),
  lang: fc.constantFrom("fr" as const, "en" as const),
  skill: fc.constantFrom("reading" as const, "writing" as const),
  status: fc.constantFrom("published" as const, "draft" as const),
});

type Scenario = {
  readonly pool: readonly Item[];
  readonly dueReviews: readonly Item[];
  readonly sessionSize: number;
  readonly testDate: string | undefined;
  readonly lastDayCompleted: boolean | undefined;
  readonly seed: number;
};

const scenario: fc.Arbitrary<Scenario> = fc
  .record({
    specs: fc.array(spec, { minLength: 0, maxLength: 25 }),
    dueCount: fc.integer({ min: 0, max: 12 }),
    sessionSize: fc.integer({ min: 0, max: 30 }),
    hoursToTest: fc.option(fc.integer({ min: -48, max: 240 }), { nil: undefined }),
    lastDayCompleted: fc.option(fc.boolean(), { nil: undefined }),
    seed: fc.integer(),
  })
  .map((s) => {
    const pool: Item[] = s.specs.map((spc, i) =>
      anItem({
        id: itemId(`p${i}`),
        subSkill: spc.subSkill,
        targetBand: spc.targetBand,
        lang: spc.lang,
        skill: spc.skill,
        status: spc.status,
      }),
    );
    const dueReviews: Item[] = Array.from({ length: s.dueCount }, (_, i) =>
      anItem({ id: itemId(`r${i}`), skill: "reading", lang: "fr", targetBand: "C", status: "published" }),
    );
    const testDate = s.hoursToTest === undefined ? undefined : new Date(new Date(NOW).getTime() + s.hoursToTest * HOUR).toISOString();
    return { pool, dueReviews, sessionSize: s.sessionSize, testDate, lastDayCompleted: s.lastDayCompleted, seed: s.seed };
  });

/** mulberry32, so the property does not depend on `@palier/testing` (would cycle). */
const rng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const inputOf = (s: Scenario) => {
  const attempts: readonly Attempt[] = [];
  const partial = {
    skill: "reading" as const,
    lang: "fr" as const,
    targetBand: "C" as const,
    sessionSize: s.sessionSize,
    dueReviews: s.dueReviews,
    pool: s.pool,
    attempts,
    ...(s.testDate === undefined ? {} : { testDate: s.testDate }),
    ...(s.lastDayCompleted === undefined ? {} : { lastDayCompleted: s.lastDayCompleted }),
  };
  return partial;
};

describe("planDay properties", () => {
  it("never plans more items than the effective budget", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const size =
          s.lastDayCompleted === false ? Math.floor(s.sessionSize * SHORTEN_FACTOR) : s.sessionSize;
        const plan = planDay(inputOf(s), rng(s.seed), NOW);
        expect(plan.items.length).toBeLessThanOrEqual(size);
      }),
    );
  });

  it("keeps the three buckets disjoint", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const plan = planDay(inputOf(s), rng(s.seed), NOW);
        const ids = [...plan.reviews, ...plan.newItems, ...plan.maintenance].map((i) => String(i.id));
        expect(new Set(ids).size).toBe(ids.length);
        expect(plan.items.length).toBe(ids.length);
      }),
    );
  });

  it("suppresses new items while tapering, and no mock exam inside 24h", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        if (s.testDate === undefined) return;
        const ms = new Date(s.testDate).getTime() - new Date(NOW).getTime();
        const tapering = ms >= 0 && ms / DAY <= TAPER_DAYS;
        const plan = planDay(inputOf(s), rng(s.seed), NOW);
        expect(plan.tapering).toBe(tapering);
        if (tapering) expect(plan.newItems).toHaveLength(0);
        expect(plan.mockExamAdvised).toBe(tapering && ms >= 24 * HOUR);
      }),
    );
  });

  it("shortens after a miss and never lengthens", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const shortened = planDay({ ...inputOf(s), lastDayCompleted: false }, rng(s.seed), NOW);
        const full = planDay({ ...inputOf(s), lastDayCompleted: true }, rng(s.seed), NOW);
        expect(shortened.items.length).toBeLessThanOrEqual(full.items.length);
      }),
    );
  });

  it("is the same plan with no oral findings as with an empty list of them (D124)", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const without = planDay(inputOf(s), rng(s.seed), NOW);
        const empty = planDay({ ...inputOf(s), focusSubSkills: [] }, rng(s.seed), NOW);
        expect(empty).toEqual(without);
      }),
    );
  });

  it("keeps every invariant with oral findings: the budget, and disjoint buckets", () => {
    fc.assert(
      fc.property(scenario, fc.subarray([...READING_SUB_SKILLS]), (s, focus) => {
        const plan = planDay({ ...inputOf(s), focusSubSkills: focus }, rng(s.seed), NOW);
        const size = s.lastDayCompleted === false ? Math.floor(s.sessionSize * SHORTEN_FACTOR) : s.sessionSize;
        const ids = plan.items.map((i) => String(i.id));
        expect(ids.length).toBeLessThanOrEqual(size);
        expect(new Set(ids).size).toBe(ids.length);
      }),
    );
  });
});
