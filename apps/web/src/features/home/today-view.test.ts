import type { PracticeActivity } from "@palier/engine";
import { describe, expect, it } from "vitest";

import { WEEK_OF_SUNDAY, calendarMarks, monthOf, skillCards, stepMonth, weekMinutes } from "./today-view";

const activity = (today: Partial<PracticeActivity["today"]> = {}): PracticeActivity => ({
  today: { reading: 0, writing: 0, oralSessions: 0, oralMs: 0, ...today },
  week: { answered: 0, oralSessions: 0, msByDay: [0, 0, 0, 0, 0, 0, 0] },
});

describe("skillCards", () => {
  it("gives reading, writing and oral in that order, each against today's plan", () => {
    const cards = skillCards(activity({ reading: 4, writing: 0 }), 12);
    expect(cards.map((c) => c.kind)).toEqual(["reading", "writing", "oral"]);
    expect(cards[0]).toEqual({ kind: "reading", done: 4, goal: 12, rail: { current: 4, total: 12 } });
    expect(cards[1]).toMatchObject({ done: 0, rail: { current: 0, total: 12 } });
  });

  it("caps the rail at the plan, while the line still counts every answer", () => {
    expect(skillCards(activity({ writing: 15 }), 12)[1]).toEqual({
      kind: "writing",
      done: 15,
      goal: 12,
      rail: { current: 12, total: 12 },
    });
  });

  it("never has a goal of zero, so the rail always has a length", () => {
    expect(skillCards(activity(), 0)[0]).toMatchObject({ goal: 1, rail: { total: 1 } });
  });

  it("fills oral's rail once a session has ended today, with the minutes actually spoken", () => {
    expect(skillCards(activity({ oralSessions: 1, oralMs: 90_000 }), 12)[2]).toEqual({
      kind: "oral",
      sessions: 1,
      minutes: 2,
      rail: { current: 1, total: 1 },
    });
    // A session answered by typing spoke nothing, so it claims no minutes.
    expect(skillCards(activity({ oralSessions: 1, oralMs: 0 }), 12)[2]).toMatchObject({ sessions: 1, minutes: 0 });
    expect(skillCards(activity({ oralSessions: 2, oralMs: 8 * 60_000 }), 12)[2]).toMatchObject({ minutes: 8 });
    expect(skillCards(activity(), 12)[2]).toEqual({ kind: "oral", sessions: 0, minutes: 0, rail: { current: 0, total: 1 } });
  });
});

describe("weekMinutes", () => {
  it("rounds the week's total to whole minutes and keeps each day in minutes for the line", () => {
    expect(weekMinutes([60_000, 0, 90_000])).toEqual({ total: 3, byDay: [1, 0, 1.5] });
  });
});

describe("calendarMarks", () => {
  it("marks practised days, then kept days, and the test date over either", () => {
    const marks = calendarMarks(["2026-10-01", "2026-10-03", "2026-10-20"], ["2026-10-02", "2026-10-03"], "2026-10-20");
    expect([...marks.entries()].sort()).toEqual([
      ["2026-10-01", "practised"],
      ["2026-10-02", "kept"],
      ["2026-10-03", "practised"],
      ["2026-10-20", "test"],
    ]);
  });

  it("marks no test without a date", () => {
    expect([...calendarMarks([], [], null).values()]).toEqual([]);
  });
});

describe("monthOf and stepMonth", () => {
  it("reads the month from a local day", () => {
    expect(monthOf("2026-10-07")).toEqual({ year: 2026, month: 10 });
  });

  it("steps forwards and backwards across a year", () => {
    expect(stepMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(stepMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(stepMonth({ year: 2026, month: 10 }, -13)).toEqual({ year: 2025, month: 9 });
    expect(stepMonth({ year: 2026, month: 10 }, 0)).toEqual({ year: 2026, month: 10 });
  });
});

describe("WEEK_OF_SUNDAY", () => {
  it("is seven consecutive days starting on a Sunday", () => {
    expect(WEEK_OF_SUNDAY).toHaveLength(7);
    expect(WEEK_OF_SUNDAY.map((at) => new Date(at).getUTCDay())).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
