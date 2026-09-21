import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { leitnerIntervalDays } from "@palier/domain";

import { retirementBox, scheduleReview } from "./scheduler.js";
import { pscSle } from "./__tests__/read-profile.js";

/**
 * implementation-plan.md §6.2, tier 2, scheduler invariants:
 *   "A correct answer never shortens the next interval, an incorrect answer
 *    always returns the item to box 1, and box 5 never schedules."
 */
const profile = pscSle();
const RETIRED = retirementBox(profile);

const aBox = fc.integer({ min: 1, max: RETIRED });
const aGrade = fc.record({ correct: fc.boolean(), changedAnswer: fc.boolean(), slow: fc.boolean() });
const anInstant = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2100-01-01T00:00:00.000Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

describe("scheduleReview properties", () => {
  it("always returns an incorrect answer to box 1", () => {
    fc.assert(
      fc.property(aBox, fc.boolean(), fc.boolean(), anInstant, (box, changedAnswer, slow, now) => {
        expect(scheduleReview(profile, box, { correct: false, changedAnswer, slow }, now).box).toBe(1);
      }),
    );
  });

  it("never lowers the box for a correct answer", () => {
    fc.assert(
      fc.property(aBox, fc.boolean(), fc.boolean(), anInstant, (box, changedAnswer, slow, now) => {
        const next = scheduleReview(profile, box, { correct: true, changedAnswer, slow }, now);
        expect(next.box).toBeGreaterThanOrEqual(box);
      }),
    );
  });

  it("never shortens the interval for a correct answer that stays in the queue", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: RETIRED - 1 }),
        fc.boolean(),
        fc.boolean(),
        anInstant,
        (box, changedAnswer, slow, now) => {
          const next = scheduleReview(profile, box, { correct: true, changedAnswer, slow }, now);
          if (next.box === RETIRED) return; // retired: compared by the null property instead
          const before = leitnerIntervalDays(profile, box);
          const after = leitnerIntervalDays(profile, next.box);
          expect(after).not.toBeNull();
          expect(before).not.toBeNull();
          expect(after as number).toBeGreaterThanOrEqual(before as number);
        },
      ),
    );
  });

  it("schedules nothing exactly when, and only when, the item has retired", () => {
    fc.assert(
      fc.property(aBox, aGrade, anInstant, (box, grade, now) => {
        const next = scheduleReview(profile, box, grade, now);
        expect(next.due === null).toBe(next.box === RETIRED);
      }),
    );
  });

  it("sets a due date strictly after now whenever one is scheduled", () => {
    fc.assert(
      fc.property(aBox, aGrade, anInstant, (box, grade, now) => {
        const next = scheduleReview(profile, box, grade, now);
        if (next.due === null) return;
        expect(Date.parse(next.due)).toBeGreaterThan(Date.parse(now));
      }),
    );
  });
});
