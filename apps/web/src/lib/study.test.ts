import { FIXTURE_BANK, memorySettingsStore } from "@palier/testing/in-memory";
import type { DayPlan } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  DAILY_GOALS,
  daysUntil,
  STUDY_PROFILE_KEY,
  minutesFor,
  parseStudyProfile,
  planRows,
  readStudyProfile,
  sessionSizeFor,
  writeStudyProfile,
} from "./study";

const PROFILE = { targetBand: "C", dailyGoalMinutes: 20, testDate: null } as const;

describe("the study profile", () => {
  it("round-trips through the settings store under one key", async () => {
    const settings = memorySettingsStore();
    await writeStudyProfile(settings, PROFILE);

    expect(await readStudyProfile(settings)).toEqual(PROFILE);
    expect((await settings.all()).map((s) => s.key)).toEqual([STUDY_PROFILE_KEY]);
  });

  it("is null on a first run, before onboarding", async () => {
    expect(await readStudyProfile(memorySettingsStore())).toBeNull();
  });

  it("accepts a declared test date", () => {
    expect(parseStudyProfile({ ...PROFILE, testDate: "2026-12-01" })?.testDate).toBe("2026-12-01");
  });

  it("refuses anything it cannot trust, rather than guessing a field", () => {
    for (const bad of [
      null,
      "C",
      { ...PROFILE, targetBand: "E" },
      { ...PROFILE, dailyGoalMinutes: 15 },
      { ...PROFILE, testDate: "next week" },
      { ...PROFILE, testDate: undefined },
    ]) {
      expect(parseStudyProfile(bad)).toBeNull();
    }
  });
});

describe("sessionSizeFor", () => {
  it("turns each §8.1 daily goal into a session of items at about a minute and a half each", () => {
    expect(DAILY_GOALS.map(sessionSizeFor)).toEqual([7, 13, 20]);
  });

  it("never plans a session shorter than five items", () => {
    expect(sessionSizeFor(1)).toBe(5);
    expect(sessionSizeFor(0)).toBe(5);
  });

  it("estimates minutes from an item count, never below one", () => {
    expect(minutesFor(10)).toBe(15);
    expect(minutesFor(0)).toBe(1);
  });
});

describe("planRows", () => {
  const items = FIXTURE_BANK.items ?? [];
  const plan = (reviews: number, fresh: number, maintenance: number): DayPlan => {
    const r = items.slice(0, reviews);
    const n = items.slice(reviews, reviews + fresh);
    const m = items.slice(reviews + fresh, reviews + fresh + maintenance);
    return { reviews: r, newItems: n, maintenance: m, items: [...r, ...n, ...m], tapering: false, mockExamAdvised: false };
  };

  it("shows the three buckets in study order with counts and minutes", () => {
    expect(planRows(plan(2, 4, 2))).toEqual([
      { kind: "review", count: 2, minutes: 3 },
      { kind: "targeted", count: 4, minutes: 6 },
      { kind: "keepSharp", count: 2, minutes: 3 },
    ]);
  });

  it("leaves out an empty bucket rather than showing zero", () => {
    expect(planRows(plan(0, 5, 0)).map((r) => r.kind)).toEqual(["targeted"]);
    expect(planRows(plan(0, 0, 0))).toEqual([]);
  });
});

describe("daysUntil", () => {
  const NOW = "2026-09-24T18:30:00.000Z";

  it("counts whole calendar days to the test, ignoring the time of day", () => {
    expect(daysUntil("2026-09-25", NOW)).toBe(1);
    expect(daysUntil("2026-10-24", NOW)).toBe(30);
  });

  it("is zero on the day of the test", () => {
    expect(daysUntil("2026-09-24", NOW)).toBe(0);
  });

  it("is null with no date, a past date, or a date it cannot read", () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("2026-09-23", NOW)).toBeNull();
    expect(daysUntil("someday", NOW)).toBeNull();
  });
});
