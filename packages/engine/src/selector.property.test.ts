import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Attempt, Item } from "@palier/domain";
import { READING_SUB_SKILLS, itemId } from "@palier/domain";

import { selectItems, workingSet } from "./selector.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * implementation-plan.md §6.2, tier 2, selector invariants:
 *   "Never returns an excluded item, never one seen inside the 14 day window,
 *    never two consecutive items from the same sub-skill."
 * (Two users with identical history getting different sequences is covered by the
 * reproducibility unit tests, which pin the random dependence exactly.)
 */
const DAY = 24 * 60 * 60 * 1000;
const NOW = "2026-06-01T00:00:00.000Z";
const daysAgo = (n: number): string => new Date(new Date(NOW).getTime() - n * DAY).toISOString();

const spec = fc.record({
  subSkill: fc.constantFrom(...READING_SUB_SKILLS),
  targetBand: fc.constantFrom("A" as const, "B" as const, "C" as const),
  lang: fc.constantFrom("fr" as const, "en" as const),
  skill: fc.constantFrom("reading" as const, "writing" as const),
  status: fc.constantFrom("published" as const, "draft" as const),
  attemptedDaysAgo: fc.option(fc.integer({ min: 0, max: 40 }), { nil: undefined }),
});

const scenario = fc
  .tuple(fc.array(spec, { minLength: 1, maxLength: 25 }), fc.integer({ min: 1, max: 20 }), fc.integer())
  .map(([specs, count, seed]) => {
    const items: Item[] = specs.map((s, i) =>
      anItem({
        id: itemId(`i${i}`),
        subSkill: s.subSkill,
        targetBand: s.targetBand,
        lang: s.lang,
        skill: s.skill,
        status: s.status,
      }),
    );
    const attempts: Attempt[] = specs.flatMap((s, i) =>
      s.attemptedDaysAgo === undefined
        ? []
        : [anAttempt({ itemId: itemId(`i${i}`), skill: "reading", ts: daysAgo(s.attemptedDaysAgo) })],
    );
    return { items, attempts, count, seed };
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

const criteria = { skill: "reading", lang: "fr", targetBand: "C", count: 0, mode: "practice" } as const;

describe("selectItems properties (practice, target C)", () => {
  it("only ever returns eligible items inside the working set", () => {
    fc.assert(
      fc.property(scenario, ({ items, attempts, count, seed }) => {
        const bands = new Set(workingSet("C"));
        for (const picked of selectItems({ ...criteria, count }, items, attempts, rng(seed), NOW)) {
          expect(picked.status).toBe("published");
          expect(picked.lang).toBe("fr");
          expect(picked.skill).toBe("reading");
          expect(bands.has(picked.targetBand)).toBe(true);
        }
      }),
    );
  });

  it("never returns an item attempted inside the 14 day window", () => {
    fc.assert(
      fc.property(scenario, ({ items, attempts, count, seed }) => {
        const excluded = new Set(
          attempts
            .filter((a) => Date.parse(a.ts) >= Date.parse(NOW) - 14 * DAY)
            .map((a) => String(a.itemId)),
        );
        for (const picked of selectItems({ ...criteria, count }, items, attempts, rng(seed), NOW)) {
          expect(excluded.has(String(picked.id))).toBe(false);
        }
      }),
    );
  });

  it("returns each item at most once and never more than the requested count", () => {
    fc.assert(
      fc.property(scenario, ({ items, attempts, count, seed }) => {
        const picked = selectItems({ ...criteria, count }, items, attempts, rng(seed), NOW);
        expect(new Set(picked.map((p) => p.id)).size).toBe(picked.length);
        expect(picked.length).toBeLessThanOrEqual(count);
      }),
    );
  });

  it("never places two consecutive items from the same sub-skill when it is feasible", () => {
    fc.assert(
      fc.property(scenario, ({ items, attempts, count, seed }) => {
        const picked = selectItems({ ...criteria, count }, items, attempts, rng(seed), NOW);
        const counts = new Map<string, number>();
        for (const p of picked) counts.set(p.subSkill, (counts.get(p.subSkill) ?? 0) + 1);
        const feasible = Math.max(0, ...counts.values()) <= Math.ceil(picked.length / 2);
        if (!feasible) return;
        const adjacent = picked.slice(1).some((p, i) => p.subSkill === picked[i]?.subSkill);
        expect(adjacent).toBe(false);
      }),
    );
  });
});
