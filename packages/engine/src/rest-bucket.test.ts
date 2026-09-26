import { describe, expect, it } from "vitest";

import { itemId } from "@palier/domain";

import { restBucket, restBuckets } from "./rest-bucket.js";
import type { ExamResult, ScoredExamItem } from "./scorer.js";

describe("restBucket", () => {
  it("puts exactly a fifth right in bucket 1, and one fewer in bucket 0", () => {
    expect(restBucket(5, 25)).toBe(1);
    expect(restBucket(4, 25)).toBe(0);
  });

  it("puts exactly four fifths in bucket 4, and one fewer in bucket 3", () => {
    expect(restBucket(20, 25)).toBe(4);
    expect(restBucket(19, 25)).toBe(3);
  });

  it("keeps a perfect rest in bucket 4 rather than a sixth bucket", () => {
    expect(restBucket(49, 49)).toBe(4);
  });

  it("puts nothing right in bucket 0", () => {
    expect(restBucket(0, 49)).toBe(0);
  });

  it("works in whole numbers, so 10 of 49 is just over a fifth", () => {
    expect(restBucket(9, 49)).toBe(0);
    expect(restBucket(10, 49)).toBe(1);
  });

  it("refuses a rest with no other scored item", () => {
    expect(() => restBucket(0, 0)).toThrow(new RangeError("A rest bucket needs at least one other scored item, not 0."));
    expect(() => restBucket(0, 1.5)).toThrow(RangeError);
  });

  it("refuses a count of right answers that is not a count", () => {
    expect(() => restBucket(-1, 10)).toThrow(new RangeError("-1 right of 10 is not a count."));
    expect(() => restBucket(11, 10)).toThrow(RangeError);
    expect(() => restBucket(2.5, 10)).toThrow(RangeError);
  });
});

const scored = (id: string, correct: boolean, pilot = false): ScoredExamItem => ({
  itemId: itemId(id),
  chosen: correct ? "a" : "b",
  correct,
  pilot,
});

const resultOf = (items: readonly ScoredExamItem[]): ExamResult => ({
  // The buckets read the items only; the outcome is a placeholder.
  outcome: { band: "X", rank: 0, raw: 0, scored: items.length, bandMin: 0, bandMax: items.length, next: null },
  items,
});

describe("restBuckets", () => {
  // Three scored items, two right, and a pilot.
  const result = resultOf([scored("a", true), scored("b", true), scored("c", false), scored("p", true, true)]);

  it("leaves a scored item's own answer out of its rest", () => {
    const buckets = restBuckets(result);
    expect(buckets.get(itemId("a"))).toBe(2); // 1 of the other 2
    expect(buckets.get(itemId("c"))).toBe(4); // 2 of the other 2
  });

  it("gives a pilot every scored item as its rest, whatever it scored itself", () => {
    expect(restBuckets(result).get(itemId("p"))).toBe(3); // 2 of 3
    const wrongPilot = resultOf([scored("a", true), scored("b", true), scored("c", false), scored("p", false, true)]);
    expect(restBuckets(wrongPilot).get(itemId("p"))).toBe(3);
  });

  it("counts an unanswered scored item as wrong in everyone's rest", () => {
    const unanswered: ScoredExamItem = { itemId: itemId("u"), chosen: null, correct: false, pilot: false };
    const buckets = restBuckets(resultOf([scored("a", true), unanswered]));
    expect(buckets.get(itemId("a"))).toBe(0); // 0 of 1
    expect(buckets.get(itemId("u"))).toBe(4); // 1 of 1
  });

  it("gives every item on the form a bucket", () => {
    expect([...restBuckets(result).keys()]).toEqual(["a", "b", "c", "p"]);
  });
});
