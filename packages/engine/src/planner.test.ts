import { describe, expect, it } from "vitest";

import type { Attempt, Item, SubSkill, TargetBand } from "@palier/domain";
import { itemId } from "@palier/domain";

import { planDay } from "./planner.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * Daily plan generation (architecture.md §7.4). Budget is item counts, not
 * minutes (D34); an oral report's fixes bias the new items (D35, D124). The planner
 * composes the selector and weakest-sub-skills, so these examples check the
 * composition — the split, the roll-over, the taper, the shortening and the
 * non-overlap — rather than re-checking the selector's own weighting and spacing.
 */
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = "2026-06-01T00:00:00.000Z";

/** A deterministic `random` cycling through fixed values. */
const seq = (values: readonly number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length] as number;
};

const item = (id: string, subSkill: SubSkill, targetBand: TargetBand, over: Partial<Item> = {}): Item =>
  anItem({ id: itemId(id), subSkill, targetBand, skill: "reading", lang: "fr", status: "published", ...over });

const review = (id: string): Item => item(id, "main-idea", "C");
const ahead = (ms: number): string => new Date(new Date(NOW).getTime() + ms).toISOString();

/** A pool of published C-band reading items over several sub-skills, none weakest. */
const CANDIDATE_SUBS: readonly SubSkill[] = [
  "main-idea",
  "inference",
  "tone-and-intent",
  "specific-detail",
];
const pool: Item[] = Array.from({ length: 24 }, (_, i) =>
  item(`p${i}`, CANDIDATE_SUBS[i % CANDIDATE_SUBS.length] ?? "main-idea", "C"),
);

const base = {
  skill: "reading",
  lang: "fr",
  targetBand: "C",
  pool,
  attempts: [] as Attempt[],
} as const;

describe("planDay, the 40/40/20 split", () => {
  it("splits a clean budget into capped reviews, new items and maintenance", () => {
    const dueReviews = ["r0", "r1", "r2", "r3", "r4", "r5"].map(review); // more than the cap

    const plan = planDay({ ...base, sessionSize: 10, dueReviews }, seq([0.3]), NOW);

    expect(plan.reviews).toHaveLength(4); // floor(10 * 0.4)
    expect(plan.newItems).toHaveLength(4); // round(6 * 2/3)
    expect(plan.maintenance).toHaveLength(2); // remainder
    expect(plan.items).toHaveLength(10);
    expect(plan.tapering).toBe(false);
    expect(plan.mockExamAdvised).toBe(false);
  });

  it("orders the day reviews, then new items, then maintenance", () => {
    const dueReviews = ["r0", "r1", "r2", "r3"].map(review);

    const plan = planDay({ ...base, sessionSize: 10, dueReviews }, seq([0.3]), NOW);

    expect(plan.items).toEqual([...plan.reviews, ...plan.newItems, ...plan.maintenance]);
  });

  it("rolls an under-filled review bucket into new items and maintenance", () => {
    const plan = planDay({ ...base, sessionSize: 10, dueReviews: [review("r0")] }, seq([0.3]), NOW);

    expect(plan.reviews).toHaveLength(1);
    expect(plan.newItems).toHaveLength(6); // round(9 * 2/3)
    expect(plan.maintenance).toHaveLength(3);
    expect(plan.items).toHaveLength(10);
  });
});

describe("planDay, buckets never overlap", () => {
  it("never places a due review among the new items or maintenance", () => {
    // A due review that is also in the selection pool, last seen long ago so the
    // selector's own 14-day recency filter would not exclude it.
    const shared = item("shared", "specific-detail", "C");
    const plan = planDay(
      { ...base, pool: [shared, ...pool], sessionSize: 12, dueReviews: [shared] },
      seq([0.3, 0.5, 0.7, 0.9]),
      NOW,
    );

    const later = new Set([...plan.newItems, ...plan.maintenance].map((i) => String(i.id)));
    expect(later.has("shared")).toBe(false);
    const all = plan.items.map((i) => String(i.id));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("planDay, maintenance is drawn from strengths", () => {
  // Make `inference` the weakest sub-skill: 8 old misses on band-A inference items
  // (present in the pool for the join, below the working set so never candidates).
  const weakHistory: Attempt[] = Array.from({ length: 8 }, (_, i) =>
    anAttempt({ itemId: itemId(`h${i}`), skill: "reading", correct: false, ts: ahead(-(30 + i) * DAY) }),
  );
  const weakItems: Item[] = Array.from({ length: 8 }, (_, i) => item(`h${i}`, "inference", "A"));

  it("keeps the weakest sub-skill out of maintenance", () => {
    const plan = planDay(
      {
        ...base,
        pool: [...pool, ...weakItems],
        attempts: weakHistory,
        sessionSize: 12,
        dueReviews: [],
      },
      seq([0.3, 0.5, 0.7, 0.2, 0.8, 0.4]),
      NOW,
    );

    expect(plan.maintenance.some((i) => i.subSkill === "inference")).toBe(false);
    expect(plan.maintenance.length).toBeGreaterThan(0);
  });
});

describe("planDay, yesterday's completion", () => {
  const dueReviews = ["r0", "r1", "r2", "r3", "r4", "r5"].map(review);

  it("shortens the budget after an incomplete day", () => {
    const plan = planDay(
      { ...base, sessionSize: 10, dueReviews, lastDayCompleted: false },
      seq([0.3]),
      NOW,
    );

    expect(plan.items.length).toBeLessThanOrEqual(5); // floor(10 * 0.5)
    expect(plan.reviews).toHaveLength(2); // floor(5 * 0.4)
  });

  it("leaves the budget unchanged when yesterday was completed", () => {
    const done = planDay({ ...base, sessionSize: 10, dueReviews, lastDayCompleted: true }, seq([0.3]), NOW);
    const absent = planDay({ ...base, sessionSize: 10, dueReviews }, seq([0.3]), NOW);

    expect(done.items).toHaveLength(10);
    expect(absent.items).toHaveLength(10);
  });
});

describe("planDay, test-date proximity", () => {
  const dueReviews = Array.from({ length: 8 }, (_, i) => review(`r${i}`));

  it("tapers to review-only with a short confidence set in the final three days", () => {
    const plan = planDay(
      { ...base, sessionSize: 10, dueReviews, testDate: ahead(2 * DAY) },
      seq([0.3]),
      NOW,
    );

    expect(plan.tapering).toBe(true);
    expect(plan.newItems).toHaveLength(0); // no new items while tapering
    expect(plan.maintenance).toHaveLength(2); // floor(10 * 0.2), the confidence set
    expect(plan.reviews).toHaveLength(8); // size - confidence set
    expect(plan.mockExamAdvised).toBe(true); // more than 24h out
  });

  it("advises no mock exam inside the final 24 hours", () => {
    const plan = planDay(
      { ...base, sessionSize: 10, dueReviews, testDate: ahead(12 * HOUR) },
      seq([0.3]),
      NOW,
    );

    expect(plan.tapering).toBe(true);
    expect(plan.mockExamAdvised).toBe(false);
    expect(plan.newItems).toHaveLength(0);
  });

  it("tapers on the test day itself but advises no mock exam", () => {
    const plan = planDay({ ...base, sessionSize: 10, dueReviews, testDate: NOW }, seq([0.3]), NOW);

    expect(plan.tapering).toBe(true);
    expect(plan.mockExamAdvised).toBe(false);
  });

  it("runs a normal plan when the test date is beyond the taper window", () => {
    const plan = planDay(
      { ...base, sessionSize: 10, dueReviews, testDate: ahead(5 * DAY) },
      seq([0.3]),
      NOW,
    );

    expect(plan.tapering).toBe(false);
    expect(plan.newItems.length).toBeGreaterThan(0);
  });

  it("does not taper for a test date in the past", () => {
    const plan = planDay(
      { ...base, sessionSize: 10, dueReviews, testDate: ahead(-DAY) },
      seq([0.3]),
      NOW,
    );

    expect(plan.tapering).toBe(false);
    expect(plan.mockExamAdvised).toBe(false);
    expect(plan.newItems.length).toBeGreaterThan(0);
  });
});

describe("planDay, reproducibility and degenerate inputs", () => {
  it("produces the same plan for the same random source", () => {
    const a = planDay({ ...base, sessionSize: 10, dueReviews: [] }, seq([0.11, 0.42, 0.73, 0.24]), NOW);
    const b = planDay({ ...base, sessionSize: 10, dueReviews: [] }, seq([0.11, 0.42, 0.73, 0.24]), NOW);

    expect(a.items.map((i) => String(i.id))).toEqual(b.items.map((i) => String(i.id)));
  });

  it("produces different plans for different random sources", () => {
    const a = planDay({ ...base, sessionSize: 10, dueReviews: [] }, seq([0.05, 0.15, 0.25, 0.35]), NOW);
    const b = planDay({ ...base, sessionSize: 10, dueReviews: [] }, seq([0.95, 0.85, 0.75, 0.65]), NOW);

    expect(a.items.map((i) => String(i.id))).not.toEqual(b.items.map((i) => String(i.id)));
  });

  it("returns an empty plan for an empty pool and no reviews", () => {
    const plan = planDay({ ...base, pool: [], sessionSize: 10, dueReviews: [] }, seq([0.3]), NOW);

    expect(plan.items).toEqual([]);
    expect(plan.tapering).toBe(false);
  });

  it("never exceeds what the pool can supply", () => {
    const plan = planDay(
      { ...base, pool: [item("only", "main-idea", "C")], sessionSize: 10, dueReviews: [] },
      seq([0.3]),
      NOW,
    );

    expect(plan.items.length).toBeLessThanOrEqual(1);
  });

  it("returns nothing for a zero budget", () => {
    const plan = planDay({ ...base, sessionSize: 0, dueReviews: [review("r0")] }, seq([0.3]), NOW);

    expect(plan.items).toEqual([]);
  });
});

/** Found by the one-off mutation check (progress.md D77): the two taper boundaries, exactly. */
describe("planDay, test-date boundaries", () => {
  const dueReviews = Array.from({ length: 8 }, (_, i) => review(`r${i}`));

  it("tapers when the test is exactly three days away", () => {
    const plan = planDay({ ...base, sessionSize: 10, dueReviews, testDate: ahead(3 * DAY) }, seq([0.3]), NOW);

    expect(plan.tapering).toBe(true);
  });

  it("caps the reviews while tapering at the day less its confidence set, however many are due", () => {
    const manyDue = Array.from({ length: 12 }, (_, i) => review(`many${i}`));

    const plan = planDay({ ...base, sessionSize: 10, dueReviews: manyDue, testDate: ahead(2 * DAY) }, seq([0.3]), NOW);

    expect(plan.reviews).toHaveLength(8);
  });

  it("still advises a mock exam when the test is exactly 24 hours away", () => {
    const plan = planDay({ ...base, sessionSize: 10, dueReviews, testDate: ahead(24 * HOUR) }, seq([0.3]), NOW);

    expect(plan.mockExamAdvised).toBe(true);
  });
});

describe("planDay, the latest oral report's fixes (D124)", () => {
  it("draws new items from a focused sub-skill as it does from the weakest", () => {
    // Equal luck: a weight of 3 always outranks 1, so every new item is on the focused sub-skill.
    const plan = planDay({ ...base, sessionSize: 9, dueReviews: [], focusSubSkills: ["tone-and-intent"] }, seq([0.5]), NOW);

    expect(plan.newItems.length).toBeGreaterThan(0);
    expect(plan.newItems.every((i) => i.subSkill === "tone-and-intent")).toBe(true);
  });

  it("leaves maintenance and reviews as they would be without it", () => {
    const dueReviews = ["r0", "r1"].map(review);
    const focused = planDay({ ...base, sessionSize: 9, dueReviews, focusSubSkills: ["tone-and-intent"] }, seq([0.5]), NOW);
    const plain = planDay({ ...base, sessionSize: 9, dueReviews }, seq([0.5]), NOW);

    expect(focused.reviews).toEqual(plain.reviews);
    expect(focused.newItems.length).toBe(plain.newItems.length);
    expect(focused.maintenance.length).toBe(plain.maintenance.length);
  });

  it("changes nothing when every fix is on another skill's sub-skill", () => {
    const focused = planDay({ ...base, sessionSize: 9, dueReviews: [], focusSubSkills: ["agreement"] }, seq([0.4, 0.7, 0.2]), NOW);
    const plain = planDay({ ...base, sessionSize: 9, dueReviews: [] }, seq([0.4, 0.7, 0.2]), NOW);

    expect(focused).toEqual(plain);
  });
});
