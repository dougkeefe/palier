import { FIXTURE_BANK, memorySettingsStore } from "@palier/testing/in-memory";
import type { DayPlan } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  DAILY_GOALS,
  NO_RESULTS,
  currentFor,
  dayRequestFor,
  highestScoredTarget,
  daysUntil,
  oneTarget,
  standingFor,
  targetFor,
  targetsOf,
  STUDY_PROFILE_KEY,
  minutesFor,
  parseStudyProfile,
  planRows,
  readStudyProfile,
  sessionSizeFor,
  writeStudyProfile,
} from "./study";

const PROFILE = { targets: targetsOf("C"), current: NO_RESULTS, dailyGoalMinutes: 20, testDate: null } as const;
/** A profile stored before D259: one target, no results. */
const OLD_PROFILE = { targetBand: "C", dailyGoalMinutes: 20, testDate: null } as const;

describe("the study profile", () => {
  it("round-trips through the settings store under one key", async () => {
    const settings = memorySettingsStore();
    await writeStudyProfile(settings, PROFILE);

    expect(await readStudyProfile(settings)).toEqual(PROFILE);
    expect((await settings.all()).map((s) => s.key)).toEqual([STUDY_PROFILE_KEY]);
  });

  it("round-trips a target and a declared result per skill (D259)", async () => {
    const settings = memorySettingsStore();
    const profile = {
      ...PROFILE,
      targets: { reading: "C", writing: "B", oral: "C" },
      current: { reading: "E", writing: "B", oral: null },
    } as const;
    await writeStudyProfile(settings, profile);

    expect(await readStudyProfile(settings)).toEqual(profile);
  });

  it("stores the highest target as targetBand too, for a tab still on the old shape (D259)", async () => {
    const settings = memorySettingsStore();
    await writeStudyProfile(settings, { ...PROFILE, targets: { reading: "B", writing: "C", oral: "A" } });

    expect(await settings.get<{ targetBand: string }>(STUDY_PROFILE_KEY)).toMatchObject({ targetBand: "C" });
  });

  it("reads a profile stored before D259 as its one target in every skill, with no results", () => {
    expect(parseStudyProfile(OLD_PROFILE)).toEqual(PROFILE);
  });

  it("prefers a skill's own target to the old single one", () => {
    expect(parseStudyProfile({ ...OLD_PROFILE, targets: { reading: "B" } })?.targets).toEqual({
      reading: "B",
      writing: "C",
      oral: "C",
    });
  });

  it("reads a declared result that is not a band as none, rather than refusing the profile", () => {
    expect(parseStudyProfile({ ...PROFILE, current: { reading: "Z", writing: 3, oral: "E" } })?.current).toEqual({
      reading: null,
      writing: null,
      oral: "E",
    });
    expect(parseStudyProfile({ ...PROFILE, current: "ECB" })?.current).toEqual(NO_RESULTS);
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
      { ...OLD_PROFILE, targetBand: "E" },
      { ...PROFILE, targets: { reading: "C", writing: "C", oral: "E" } },
      { dailyGoalMinutes: 20, testDate: null },
      { ...PROFILE, dailyGoalMinutes: 15 },
      { ...PROFILE, testDate: "next week" },
      { ...PROFILE, testDate: undefined },
    ]) {
      expect(parseStudyProfile(bad)).toBeNull();
    }
  });
});

describe("a skill's target, result and standing (D259)", () => {
  const profile = {
    ...PROFILE,
    targets: { reading: "C", writing: "C", oral: "B" },
    current: { reading: "E", writing: "C", oral: "A" },
  } as const;

  it("reads each skill's own target and result", () => {
    expect(targetFor(profile, "oral")).toBe("B");
    expect(currentFor(profile, "reading")).toBe("E");
    expect(currentFor(PROFILE, "writing")).toBeNull();
  });

  it("stands each skill against its own target, at the profile's exempt band", () => {
    expect(standingFor(profile, "reading", "E")).toBe("exempt");
    expect(standingFor(profile, "writing", "E")).toBe("held");
    expect(standingFor(profile, "oral", "E")).toBe("working");
    expect(standingFor(PROFILE, "oral", "E")).toBe("unknown");
  });

  it("reads the scored skills at the higher of their two targets, never speaking's", () => {
    expect(highestScoredTarget({ ...PROFILE, targets: { reading: "B", writing: "C", oral: "B" } })).toBe("C");
    expect(highestScoredTarget({ ...PROFILE, targets: { reading: "C", writing: "B", oral: "B" } })).toBe("C");
    expect(highestScoredTarget({ ...PROFILE, targets: { reading: "B", writing: "B", oral: "C" } })).toBe("B");
  });

  it("names the one target every skill shares, or none when they differ", () => {
    expect(oneTarget(targetsOf("B"))).toBe("B");
    expect(oneTarget(profile.targets)).toBeNull();
  });
});

describe("dayRequestFor (D259)", () => {
  it("plans a skill at its own target, sized by the goal, with the test date", () => {
    expect(
      dayRequestFor({ ...PROFILE, targets: { reading: "B", writing: "C", oral: "C" }, testDate: "2026-12-01" }, "reading", "E"),
    ).toEqual({ targetBand: "B", sessionSize: 13, testDate: "2026-12-01T00:00:00.000Z" });
  });

  it("keeps a skill held at its target sharp, and plans the others in full", () => {
    const profile = { ...PROFILE, current: { reading: "C", writing: "B", oral: null } } as const;
    expect(dayRequestFor(profile, "reading", "E")).toEqual({ targetBand: "C", sessionSize: 13, maintaining: true });
    expect(dayRequestFor(profile, "writing", "E")).toEqual({ targetBand: "C", sessionSize: 13 });
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
