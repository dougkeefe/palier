import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  canSkipFrom,
  destinationFor,
  profileFrom,
  stepAfter,
  stepBefore,
} from "./onboarding";

describe("onboarding steps", () => {
  it("runs direction, target, placement, goal, and nothing after the goal", () => {
    expect(ONBOARDING_STEPS).toEqual(["direction", "target", "placement", "goal"]);
    expect(stepAfter("direction")).toBe("target");
    expect(stepAfter("goal")).toBeNull();
  });

  it("goes back one step at a time, and nowhere before the first", () => {
    expect(stepBefore("goal")).toBe("placement");
    expect(stepBefore("direction")).toBeNull();
  });

  it("can be skipped only once the target is chosen (§8.1: skippable after step 2)", () => {
    expect(canSkipFrom("direction")).toBe(false);
    expect(canSkipFrom("target")).toBe(false);
    expect(canSkipFrom("placement")).toBe(true);
    expect(canSkipFrom("goal")).toBe(true);
  });
});

describe("what onboarding produces", () => {
  it("stores the target, goal and test date, but not the placement choice", () => {
    expect(profileFrom({ ...DEFAULT_CHOICES, targetBand: "B", testDate: "2026-12-01", dailyGoalMinutes: 30 })).toEqual({
      targetBand: "B",
      dailyGoalMinutes: 30,
      testDate: "2026-12-01",
    });
  });

  it("treats an emptied date field as no test date", () => {
    expect(profileFrom({ ...DEFAULT_CHOICES, testDate: "" }).testDate).toBeNull();
  });

  it("lands on the diagnostic when chosen, and on today's plan otherwise", () => {
    expect(destinationFor({ ...DEFAULT_CHOICES, placement: "diagnostic" })).toBe("/diagnostic");
    expect(destinationFor(DEFAULT_CHOICES)).toBe("/home");
  });

  it("defaults a user who skips to C, 20 minutes, no date and no diagnostic", () => {
    expect(DEFAULT_CHOICES).toEqual({ targetBand: "C", testDate: null, placement: "skip", dailyGoalMinutes: 20 });
  });
});
