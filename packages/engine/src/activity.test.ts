import { describe, expect, it } from "vitest";

import { ACTIVITY_DAYS, weekActivity } from "./activity.js";

const TODAY = "2026-10-07";
const ZONE = "America/Toronto";

describe("weekActivity", () => {
  it("is all zeros with nothing practised, with one value for each day of the window", () => {
    const activity = weekActivity({ attempts: [], oral: [], today: TODAY, timeZone: ZONE });
    expect(activity.today).toEqual({ reading: 0, writing: 0, oralSessions: 0, oralMs: 0 });
    expect(activity.week).toEqual({ answered: 0, oralSessions: 0, msByDay: Array(ACTIVITY_DAYS).fill(0) });
  });

  it("counts today's answers per skill, on the device's day rather than UTC's", () => {
    const activity = weekActivity({
      attempts: [
        { skill: "reading", ts: "2026-10-07T14:00:00.000Z", msToConfirm: 30_000 },
        { skill: "reading", ts: "2026-10-07T15:00:00.000Z", msToConfirm: 20_000 },
        { skill: "writing", ts: "2026-10-07T16:00:00.000Z", msToConfirm: 10_000 },
        // 23:30 in Toronto on the 6th: UTC's 7th, but yesterday on the device.
        { skill: "writing", ts: "2026-10-07T03:30:00.000Z", msToConfirm: 5_000 },
      ],
      oral: [],
      today: TODAY,
      timeZone: ZONE,
    });
    expect(activity.today.reading).toBe(2);
    expect(activity.today.writing).toBe(1);
    expect(activity.week.answered).toBe(4);
    expect(activity.week.msByDay.at(-1)).toBe(60_000);
    expect(activity.week.msByDay.at(-2)).toBe(5_000);
  });

  it("leaves out what falls before the window or after today, and an oral-skill attempt", () => {
    const activity = weekActivity({
      attempts: [
        { skill: "reading", ts: "2026-09-30T16:00:00.000Z", msToConfirm: 1_000 },
        { skill: "reading", ts: "2026-10-01T16:00:00.000Z", msToConfirm: 2_000 },
        { skill: "reading", ts: "2026-10-08T16:00:00.000Z", msToConfirm: 4_000 },
        { skill: "oral", ts: "2026-10-07T16:00:00.000Z", msToConfirm: 8_000 },
      ],
      oral: [{ endedAt: "2026-09-29T16:00:00.000Z", spokenMs: 60_000 }],
      today: TODAY,
      timeZone: ZONE,
    });
    expect(activity.week.answered).toBe(1);
    expect(activity.week.msByDay[0]).toBe(2_000);
    expect(activity.week.oralSessions).toBe(0);
    expect(activity.today.reading).toBe(0);
  });

  it("adds an ended oral session's spoken time to its day, and counts today's", () => {
    const activity = weekActivity({
      attempts: [],
      oral: [
        { endedAt: "2026-10-07T16:00:00.000Z", spokenMs: 120_000 },
        { endedAt: "2026-10-05T16:00:00.000Z", spokenMs: 90_000 },
      ],
      today: TODAY,
      timeZone: ZONE,
    });
    expect(activity.today.oralSessions).toBe(1);
    expect(activity.today.oralMs).toBe(120_000);
    expect(activity.week.oralSessions).toBe(2);
    expect(activity.week.msByDay.at(-1)).toBe(120_000);
    expect(activity.week.msByDay.at(-3)).toBe(90_000);
  });

  it("never lets a negative measurement take time away", () => {
    const activity = weekActivity({
      attempts: [{ skill: "writing", ts: "2026-10-07T16:00:00.000Z", msToConfirm: -5 }],
      oral: [{ endedAt: "2026-10-07T16:00:00.000Z", spokenMs: -5 }],
      today: TODAY,
      timeZone: ZONE,
    });
    expect(activity.week.msByDay.at(-1)).toBe(0);
    expect(activity.today.oralMs).toBe(0);
  });
});
