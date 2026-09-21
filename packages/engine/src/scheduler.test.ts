import { describe, expect, it } from "vitest";

import { retirementBox, scheduleReview } from "./scheduler.js";
import { pscSle } from "./__tests__/read-profile.js";

/**
 * architecture.md §7.3, the Leitner rule:
 *   "Correct moves the item up one box. Incorrect sends it back to box 1,
 *    always. An item answered correctly but slowly, or where the user changed
 *    their answer, holds its box rather than advancing."
 *   Box 5 is retirement from the queue. The four intervals are values in the
 *   profile, not constants in code (ADR 8).
 *
 * `psc-sle` intervals are [1, 3, 7, 21] days for boxes 1–4; box 5 is retirement.
 * `now` is a plain ISO string (progress.md D32), and midnight in, midnight out.
 */
const profile = pscSle();
const MIDNIGHT = "2026-01-01T00:00:00.000Z";
const RETIRED = retirementBox(profile);

const clean = { correct: true, changedAnswer: false, slow: false };

describe("scheduleReview, advancing", () => {
  it("moves a clean correct answer up one box, due at the new box's interval", () => {
    // box 1 → box 2, whose interval is 3 days.
    expect(scheduleReview(profile, 1, clean, MIDNIGHT)).toEqual({
      box: 2,
      due: "2026-01-04T00:00:00.000Z",
    });
  });

  it("retires an item that clears the last review box, scheduling nothing", () => {
    // box 4 → box 5 (retirement): no interval, no due date.
    expect(scheduleReview(profile, 4, clean, MIDNIGHT)).toEqual({
      box: RETIRED,
      due: null,
    });
  });

  it("never schedules a review for an item already retired", () => {
    expect(scheduleReview(profile, RETIRED, clean, MIDNIGHT)).toEqual({
      box: RETIRED,
      due: null,
    });
  });
});

describe("scheduleReview, missing and holding", () => {
  it("sends an incorrect answer back to box 1, due tomorrow", () => {
    expect(scheduleReview(profile, 3, { correct: false, changedAnswer: false, slow: false }, MIDNIGHT)).toEqual({
      box: 1,
      due: "2026-01-02T00:00:00.000Z",
    });
  });

  it("returns to box 1 even from box 1, so a miss always resets", () => {
    expect(scheduleReview(profile, 1, { correct: false, changedAnswer: false, slow: false }, MIDNIGHT).box).toBe(1);
  });

  it("holds the box when a correct answer changed its mind", () => {
    // box 2 holds at box 2, whose interval is 3 days.
    expect(scheduleReview(profile, 2, { correct: true, changedAnswer: true, slow: false }, MIDNIGHT)).toEqual({
      box: 2,
      due: "2026-01-04T00:00:00.000Z",
    });
  });

  it("holds the box when a correct answer was slow", () => {
    // box 3 holds at box 3, whose interval is 7 days.
    expect(scheduleReview(profile, 3, { correct: true, changedAnswer: false, slow: true }, MIDNIGHT)).toEqual({
      box: 3,
      due: "2026-01-08T00:00:00.000Z",
    });
  });

  it("lets an incorrect answer override the changed-answer hold, resetting to box 1", () => {
    expect(scheduleReview(profile, 4, { correct: false, changedAnswer: true, slow: true }, MIDNIGHT).box).toBe(1);
  });
});

describe("scheduleReview, guards and helpers", () => {
  it("throws on a box below 1", () => {
    expect(() => scheduleReview(profile, 0, clean, MIDNIGHT)).toThrow(RangeError);
  });

  it("throws on a box above retirement", () => {
    expect(() => scheduleReview(profile, RETIRED + 1, clean, MIDNIGHT)).toThrow(RangeError);
  });

  it("throws on a non-integer box", () => {
    expect(() => scheduleReview(profile, 2.5, clean, MIDNIGHT)).toThrow(RangeError);
  });

  it("derives the retirement box from the profile's interval count, not a constant", () => {
    expect(retirementBox(profile)).toBe(profile.leitnerIntervalDays.length + 1);
  });
});
