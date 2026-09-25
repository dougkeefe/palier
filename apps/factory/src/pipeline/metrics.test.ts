import { describe, expect, it } from "vitest";

import type { Item } from "@palier/domain";

import type { ReviewResult } from "../lib/types.js";
import { batchReport, discardReasonCounts } from "./metrics.js";
import type { ValidationReport } from "./validate.js";

const fakeItems = (n: number): Item[] => Array.from({ length: n }, (_, i) => ({ id: `I${String(i)}` }) as unknown as Item);

const review = (passed: number): ReviewResult<Item> => ({ passed: fakeItems(passed), discarded: [] });

const validation = (valid: number): ValidationReport => ({
  valid: fakeItems(valid),
  rejected: [],
  nearDuplicates: [],
  keyDistribution: { a: 0, b: 0, c: 0, d: 0 },
  keyDistributionOk: true,
  formIssues: [],
});

const base = { batchId: "b", generatedAt: "t", provider: "scripted", sources: 1, passages: 1 };

describe("batchReport", () => {
  it("computes yield and cost per accepted item", () => {
    const r = batchReport({ ...base, itemsDrafted: 10, review: review(6), validation: validation(5), totalCostUsd: 1 });
    expect(r.stage4Yield).toBe(0.6);
    expect(r.costPerAcceptedItemUsd).toBe(0.2);
  });

  it("reports zero yield when nothing was drafted", () => {
    const r = batchReport({ ...base, itemsDrafted: 0, review: review(0), validation: validation(0), totalCostUsd: null });
    expect(r.stage4Yield).toBe(0);
    expect(r.costPerAcceptedItemUsd).toBeNull();
  });

  it("keeps carried items out of the batch's published count and its cost per item", () => {
    const r = batchReport({ ...base, itemsDrafted: 10, review: review(6), validation: validation(9), carriedPublished: 4, totalCostUsd: 1 });
    expect(r.counts.itemsPublished).toBe(5);
    expect(r.counts.itemsCarried).toBe(4);
    expect(r.costPerAcceptedItemUsd).toBe(0.2);
  });

  it("counts no carried items when none were carried", () => {
    const r = batchReport({ ...base, itemsDrafted: 10, review: review(6), validation: validation(5), totalCostUsd: 1 });
    expect(r.counts.itemsCarried).toBe(0);
  });

  it("reports null cost when nothing was published", () => {
    const r = batchReport({ ...base, itemsDrafted: 4, review: review(2), validation: validation(0), totalCostUsd: 5 });
    expect(r.costPerAcceptedItemUsd).toBeNull();
  });
});

describe("discardReasonCounts", () => {
  it("tallies each cause, counting an item once per distinct cause", () => {
    const counts = discardReasonCounts([
      { stemFr: "a", reasons: ['reviewer chose "b", intended "a"', "confidence 0.3 below 0.7"] },
      { stemFr: "b", reasons: ["register flag: reads as European"] },
      { stemFr: "c", reasons: ["defensible distractor(s): b"] },
      { stemFr: "d", reasons: ["estimated band A is more than one band from C"] },
      { stemFr: "e", reasons: ["something unrecognised"] },
    ]);
    expect(counts).toEqual({
      "key-mismatch": 1,
      "low-confidence": 1,
      register: 1,
      "defensible-distractor": 1,
      "band-mismatch": 1,
      other: 1,
    });
  });

  it("does not double-count a cause that appears twice on one item", () => {
    const counts = discardReasonCounts([
      { stemFr: "a", reasons: ["register flag: x", "register flag: y"] },
    ]);
    expect(counts).toEqual({ register: 1 });
  });
});
