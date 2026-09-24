import { describe, expect, it } from "vitest";

import { planDay } from "./planner.js";
import { selectItems } from "./selector.js";
import { attempts, golden, items, mulberry32 } from "./__tests__/practice-record.js";

/**
 * Golden fixtures are the contract (implementation-plan.md §5): with the recorded history
 * and a seeded random source, the selector and the planner choose exactly these items.
 * A change to weighting, the 14-day exclusion, sub-skill spacing or the bucket split moves
 * them, and must be explained in the PR.
 */
const { now, expected } = golden;

describe("selectItems golden practice record", () => {
  it("picks the recorded items for the recorded seed", () => {
    const { seed, targetBand, count, ids } = expected.selection;

    const picked = selectItems({ skill: "reading", lang: "fr", targetBand, count }, items, attempts, mulberry32(seed), now);

    expect(picked.map((i) => i.id)).toEqual(ids);
  });
});

describe("planDay golden practice record", () => {
  it("plans the recorded reviews, new items and maintenance for the recorded seed", () => {
    const { seed, targetBand, sessionSize, dueItems } = expected.plan;
    const dueReviews = items.filter((i) => dueItems.includes(i.id));

    const plan = planDay({ skill: "reading", lang: "fr", targetBand, sessionSize, dueReviews, pool: items, attempts }, mulberry32(seed), now);

    expect({
      reviews: plan.reviews.map((i) => i.id),
      newItems: plan.newItems.map((i) => i.id),
      maintenance: plan.maintenance.map((i) => i.id),
    }).toEqual({ reviews: expected.plan.reviews, newItems: expected.plan.newItems, maintenance: expected.plan.maintenance });
  });
});
