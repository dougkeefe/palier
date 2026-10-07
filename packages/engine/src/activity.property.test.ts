import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ACTIVITY_DAYS, weekActivity } from "./activity.js";

/**
 * The week is a function of the record set (D73): two devices that hold the same answers in a
 * different order show the same week. And it adds up: the week's count is the answers inside the
 * window, and the days' time is the time of those answers.
 */
const TODAY = "2026-10-07";
const NOON_MS = Date.parse(`${TODAY}T12:00:00.000Z`);
const DAY_MS = 86_400_000;

const attempt = fc.record({
  skill: fc.constantFrom("reading" as const, "writing" as const),
  daysBack: fc.integer({ min: -2, max: 12 }),
  msToConfirm: fc.integer({ min: 0, max: 600_000 }),
});

const asAttempt = (a: { skill: "reading" | "writing"; daysBack: number; msToConfirm: number }) => ({
  skill: a.skill,
  ts: new Date(NOON_MS - a.daysBack * DAY_MS).toISOString(),
  msToConfirm: a.msToConfirm,
});

describe("weekActivity, over any history", () => {
  it("does not depend on the order of the records", () => {
    fc.assert(
      fc.property(fc.array(attempt, { maxLength: 60 }), (raw) => {
        const attempts = raw.map(asAttempt);
        const forward = weekActivity({ attempts, oral: [], today: TODAY, timeZone: "UTC" });
        const reversed = weekActivity({ attempts: [...attempts].reverse(), oral: [], today: TODAY, timeZone: "UTC" });
        expect(reversed).toEqual(forward);
      }),
    );
  });

  it("counts exactly the answers in the window, and sums exactly their time", () => {
    fc.assert(
      fc.property(fc.array(attempt, { maxLength: 60 }), (raw) => {
        const inWindow = raw.filter((a) => a.daysBack >= 0 && a.daysBack < ACTIVITY_DAYS);
        const activity = weekActivity({ attempts: raw.map(asAttempt), oral: [], today: TODAY, timeZone: "UTC" });
        expect(activity.week.answered).toBe(inWindow.length);
        expect(activity.week.msByDay.reduce((s, ms) => s + ms, 0)).toBe(inWindow.reduce((s, a) => s + a.msToConfirm, 0));
        expect(activity.today.reading + activity.today.writing).toBe(inWindow.filter((a) => a.daysBack === 0).length);
      }),
    );
  });
});
