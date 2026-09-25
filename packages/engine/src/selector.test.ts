import { describe, expect, it } from "vitest";

import type { Attempt, Item, SubSkill, TargetBand } from "@palier/domain";
import { itemId } from "@palier/domain";

import { selectItems, workingSet } from "./selector.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * architecture.md §7.2: a filter and a weighted shuffle.
 *   candidates = published items where lang and skill match, targetBand is in the
 *   working set (target band plus one below), not attempted in the last 14 days.
 *   weight(item) = 3 if subSkill is in the three weakest, else 1.
 *   pick n weighted without replacement, then order so no two consecutive items
 *   share a sub-skill.
 */
const DAY = 24 * 60 * 60 * 1000;
const NOW = "2026-06-01T00:00:00.000Z";

/** A deterministic `random` cycling through fixed values, for exact assertions. */
const seq = (values: readonly number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length] as number;
};

/** A published reading item on a sub-skill and band, never yet attempted. */
const item = (id: string, subSkill: SubSkill, targetBand: TargetBand, over: Partial<Item> = {}): Item =>
  anItem({ id: itemId(id), subSkill, targetBand, skill: "reading", lang: "fr", status: "published", ...over });

const daysAgo = (n: number): string => new Date(new Date(NOW).getTime() - n * DAY).toISOString();

describe("workingSet", () => {
  it("is the target band plus the one below it", () => {
    expect(workingSet("C")).toEqual(["B", "C"]);
    expect(workingSet("B")).toEqual(["A", "B"]);
  });

  it("is just the target when nothing sits below it", () => {
    expect(workingSet("A")).toEqual(["A"]);
  });
});

describe("selectItems, filtering (practice)", () => {
  const base = { skill: "reading", lang: "fr", targetBand: "C", count: 10, mode: "practice" } as const;

  it("returns only items whose language matches", () => {
    const pool = [item("keep", "main-idea", "C"), item("drop", "inference", "C", { lang: "en" })];

    const picked = selectItems(base, pool, [], seq([0.1]), NOW);

    expect(picked.map((p) => p.id)).toEqual([itemId("keep")]);
  });

  it("returns only items whose skill matches", () => {
    const pool = [item("keep", "main-idea", "C"), item("drop", "agreement", "C", { skill: "writing" })];

    expect(selectItems(base, pool, [], seq([0.1]), NOW).map((p) => p.id)).toEqual([itemId("keep")]);
  });

  it("keeps items in the working set and drops bands outside it", () => {
    const pool = [
      item("b", "main-idea", "B"),
      item("c", "inference", "C"),
      item("a", "tone-and-intent", "A"), // below the working set for target C
    ];

    const ids = selectItems(base, pool, [], seq([0.1, 0.1, 0.1]), NOW).map((p) => String(p.id)).sort();
    expect(ids).toEqual(["b", "c"]);
  });

  it("excludes an item attempted within the last 14 days", () => {
    const pool = [item("fresh", "main-idea", "C"), item("recent", "inference", "C")];
    const attempts: Attempt[] = [anAttempt({ itemId: itemId("recent"), skill: "reading", ts: daysAgo(13) })];

    expect(selectItems(base, pool, attempts, seq([0.1]), NOW).map((p) => p.id)).toEqual([itemId("fresh")]);
  });

  it("includes an item last attempted more than 14 days ago", () => {
    const pool = [item("old", "main-idea", "C")];
    const attempts: Attempt[] = [anAttempt({ itemId: itemId("old"), skill: "reading", ts: daysAgo(15) })];

    expect(selectItems(base, pool, attempts, seq([0.1]), NOW)).toHaveLength(1);
  });

  it("excludes items that are not published", () => {
    const pool = [item("keep", "main-idea", "C"), item("draft", "inference", "C", { status: "draft" })];

    expect(selectItems(base, pool, [], seq([0.1]), NOW).map((p) => p.id)).toEqual([itemId("keep")]);
  });

  it("returns at most the requested count", () => {
    const pool = Array.from({ length: 10 }, (_, i) => item(`i${i}`, "main-idea", "C"));

    expect(selectItems({ ...base, count: 4 }, pool, [], seq([0.3]), NOW)).toHaveLength(4);
  });

  it("returns every distinct candidate at most once", () => {
    const pool = [item("x", "main-idea", "C"), item("y", "inference", "C")];

    const picked = selectItems({ ...base, count: 5 }, pool, [], seq([0.4, 0.6]), NOW);
    expect(new Set(picked.map((p) => p.id)).size).toBe(picked.length);
  });

  it("defaults to practice mode when none is given, honouring the working set", () => {
    const pool = [item("c", "main-idea", "C"), item("a", "tone-and-intent", "A")];

    const picked = selectItems({ skill: "reading", lang: "fr", targetBand: "C", count: 5 }, pool, [], seq([0.1, 0.2]), NOW);
    expect(picked.map((p) => p.id)).toEqual([itemId("c")]);
  });
});

describe("selectItems, weighting (practice)", () => {
  const base = { skill: "reading", lang: "fr", targetBand: "C", count: 1, mode: "practice" } as const;

  // Make `inference` a weakest sub-skill: 8 old misses on band-A items (in the
  // pool for the weakest join, but below the working set so never candidates).
  const weakHistory: Attempt[] = Array.from({ length: 8 }, (_, i) =>
    anAttempt({ itemId: itemId(`h${i}`), skill: "reading", correct: false, ts: daysAgo(30 + i) }),
  );
  const weakHistoryItems: Item[] = Array.from({ length: 8 }, (_, i) => item(`h${i}`, "inference", "A"));
  // Candidates in pool order [weak(inference, weight 3), normal(main-idea, weight 1)].
  const pool = [item("weak", "inference", "C"), item("normal", "main-idea", "C"), ...weakHistoryItems];

  it("favours a weakest sub-skill: at equal luck the weighted item is chosen", () => {
    // Both draw 0.5; Efraimidis–Spirakis keys are 0.5^(1/3) > 0.5^(1/1).
    const picked = selectItems(base, pool, weakHistory, seq([0.5]), NOW);

    expect(String(picked[0]?.id)).toBe("weak");
  });

  it("lets luck overcome the weight when it is lopsided enough", () => {
    // weak draws 0.5 (key 0.79), normal draws 0.999 (key 0.999) → normal wins.
    const picked = selectItems(base, pool, weakHistory, seq([0.5, 0.999]), NOW);

    expect(String(picked[0]?.id)).toBe("normal");
  });
});

describe("selectItems, ordering (practice)", () => {
  const base = { skill: "reading", lang: "fr", targetBand: "C", count: 6, mode: "practice" } as const;

  it("never places two consecutive items from the same sub-skill when it can avoid it", () => {
    const pool = [
      item("a1", "main-idea", "C"),
      item("a2", "main-idea", "C"),
      item("a3", "main-idea", "C"),
      item("b1", "inference", "C"),
      item("b2", "inference", "C"),
      item("b3", "inference", "C"),
    ];

    const picked = selectItems(base, pool, [], seq([0.2, 0.5, 0.8, 0.1, 0.9, 0.4]), NOW);
    const consecutive = picked.slice(1).some((it, i) => it.subSkill === picked[i]?.subSkill);
    expect({ length: picked.length, consecutive }).toEqual({ length: 6, consecutive: false });
  });

  it("still returns everything when one sub-skill unavoidably dominates", () => {
    const pool = [
      item("a1", "main-idea", "C"),
      item("a2", "main-idea", "C"),
      item("a3", "main-idea", "C"),
    ];

    expect(selectItems(base, pool, [], seq([0.3]), NOW)).toHaveLength(3);
  });
});

describe("selectItems, reproducibility", () => {
  const base = { skill: "reading", lang: "fr", targetBand: "C", count: 4, mode: "practice" } as const;
  const subs = ["main-idea", "inference", "tone-and-intent", "specific-detail"] as const;
  const pool = Array.from({ length: 8 }, (_, i) => item(`i${i}`, subs[i % 4] ?? "main-idea", "C"));

  it("produces the same sequence for the same random source", () => {
    const a = selectItems(base, pool, [], seq([0.11, 0.42, 0.73, 0.24]), NOW);
    const b = selectItems(base, pool, [], seq([0.11, 0.42, 0.73, 0.24]), NOW);

    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("produces different sequences for different random sources", () => {
    const a = selectItems(base, pool, [], seq([0.05, 0.15, 0.25, 0.35]), NOW);
    const b = selectItems(base, pool, [], seq([0.95, 0.85, 0.75, 0.65]), NOW);

    expect(a.map((p) => String(p.id))).not.toEqual(b.map((p) => String(p.id)));
  });
});

describe("selectItems, diagnostic mode", () => {
  const base = { skill: "reading", lang: "fr", targetBand: "B", count: 6, mode: "diagnostic" } as const;

  it("samples across all bands, not just the working set", () => {
    const pool = [
      item("a", "main-idea", "A"),
      item("b", "inference", "B"),
      item("c", "tone-and-intent", "C"),
    ];

    const bands = new Set(selectItems(base, pool, [], seq([0, 0, 0]), NOW).map((p) => p.targetBand));
    expect(bands).toEqual(new Set(["A", "B", "C"]));
  });

  it("covers several sub-skills for coverage rather than targeting", () => {
    const pool = [
      item("a", "main-idea", "A"),
      item("b", "inference", "B"),
      item("c", "tone-and-intent", "C"),
      item("d", "specific-detail", "B"),
    ];

    const subSkills = new Set(selectItems(base, pool, [], seq([0, 0, 0, 0]), NOW).map((p) => p.subSkill));
    expect(subSkills.size).toBeGreaterThanOrEqual(3);
  });

  it("still honours the language, skill, publication and recency filters", () => {
    const pool = [
      item("keep", "main-idea", "B"),
      item("en", "inference", "B", { lang: "en" }),
      item("draft", "tone-and-intent", "B", { status: "draft" }),
    ];

    expect(selectItems(base, pool, [], seq([0, 0]), NOW).map((p) => p.id)).toEqual([itemId("keep")]);
  });
});

/** Found by the one-off mutation check (progress.md D77): the exclusion window's edge, exactly. */
describe("selectItems, the 14-day edge", () => {
  const base = { skill: "reading", lang: "fr", targetBand: "C", count: 10, mode: "practice" } as const;

  it("still excludes an item attempted exactly 14 days ago", () => {
    const pool = [item("fresh", "main-idea", "C"), item("edge", "inference", "C")];
    const attempts: Attempt[] = [anAttempt({ itemId: itemId("edge"), skill: "reading", ts: daysAgo(14) })];

    expect(selectItems(base, pool, attempts, seq([0.1]), NOW).map((p) => p.id)).toEqual([itemId("fresh")]);
  });
});
