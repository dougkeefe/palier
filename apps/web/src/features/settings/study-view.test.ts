import { describe, expect, it } from "vitest";

import { NO_RESULTS, type StudyProfile, targetsOf } from "../../lib/study";
import { changed, testDateFrom } from "./study-view";

const SAVED: StudyProfile = { targets: targetsOf("C"), current: NO_RESULTS, dailyGoalMinutes: 20, testDate: null };

describe("the study settings (D259)", () => {
  it("has nothing to save until something differs", () => {
    expect(changed(SAVED, { ...SAVED })).toBe(false);
  });

  it("has something to save when a result, a target, the goal or the date changes", () => {
    expect(changed(SAVED, { ...SAVED, current: { ...NO_RESULTS, oral: "E" } })).toBe(true);
    expect(changed(SAVED, { ...SAVED, targets: { ...SAVED.targets, writing: "B" } })).toBe(true);
    expect(changed(SAVED, { ...SAVED, dailyGoalMinutes: 30 })).toBe(true);
    expect(changed(SAVED, { ...SAVED, testDate: "2026-12-01" })).toBe(true);
  });

  it("reads an emptied date field as no test date", () => {
    expect(testDateFrom("")).toBeNull();
    expect(testDateFrom("2026-12-01")).toBe("2026-12-01");
  });
});
