import { describe, expect, it } from "vitest";

import { scheduleReview } from "./scheduler.js";
import { golden } from "./__tests__/practice-record.js";
import { pscSle } from "./__tests__/read-profile.js";

/**
 * Golden fixtures are the contract (implementation-plan.md §5): the recorded "schedule
 * states" — the Leitner box and due instant after each of 120 answers, on the real
 * profile's intervals, each answer reviewed from its item's box after the one before.
 */
const profile = pscSle();

const replayed = (() => {
  const boxes = new Map<string, number>();
  return golden.responses.map((r) => {
    const review = scheduleReview(profile, boxes.get(r.item) ?? 1, r, r.ts);
    boxes.set(r.item, review.box);
    return { item: r.item, box: review.box, due: review.due };
  });
})();

describe("scheduleReview golden practice record", () => {
  it.each(golden.expected.schedule.map((expected, i) => ({ i, expected })))(
    "reproduces the recorded box and due date after answer $i",
    ({ i, expected }) => {
      expect(replayed[i]).toEqual(expected);
    },
  );
});
