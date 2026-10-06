import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  canSkipFrom,
  destinationFor,
  profileFrom,
  stepAfter,
  stepBefore,
  stepperSegments,
  stepsFor,
} from "./onboarding";

describe("onboarding steps", () => {
  it("has §8.1's five steps: direction, target, placement, goal, and the optional key", () => {
    expect(ONBOARDING_STEPS).toEqual(["direction", "target", "placement", "goal", "key"]);
    expect(ONBOARDING_TOTAL).toBe(5);
  });

  it("on the diagnostic path runs direction, target, placement, goal, and nothing after the goal (the diagnostic's own gate asks for the key, ADR 25)", () => {
    expect(stepsFor("diagnostic")).toEqual(["direction", "target", "placement", "goal"]);
    expect(stepAfter("direction", "diagnostic")).toBe("target");
    expect(stepAfter("goal", "diagnostic")).toBeNull();
  });

  it("on the skip path ends with the key step, since no diagnostic follows", () => {
    expect(stepsFor("skip")).toEqual(ONBOARDING_STEPS);
    expect(stepAfter("goal", "skip")).toBe("key");
    expect(stepAfter("key", "skip")).toBeNull();
  });

  it("goes back one step at a time, and nowhere before the first", () => {
    expect(stepBefore("key")).toBe("goal");
    expect(stepBefore("goal")).toBe("placement");
    expect(stepBefore("direction")).toBeNull();
  });

  it("can be skipped only once the target is chosen (§8.1: skippable after step 2)", () => {
    expect(canSkipFrom("direction")).toBe(false);
    expect(canSkipFrom("target")).toBe(false);
    expect(canSkipFrom("placement")).toBe(true);
    expect(canSkipFrom("goal")).toBe(true);
    expect(canSkipFrom("key")).toBe(true);
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

  it("lands on the key screen when step 5's 'Add a key now' is chosen", () => {
    expect(destinationFor(DEFAULT_CHOICES, { addKey: true })).toBe("/settings/key");
    expect(destinationFor(DEFAULT_CHOICES, { addKey: false })).toBe("/home");
  });

  it("defaults a user who skips to C, 20 minutes, no date and no diagnostic", () => {
    expect(DEFAULT_CHOICES).toEqual({ targetBand: "C", testDate: null, placement: "skip", dailyGoalMinutes: 20 });
  });
});

describe("stepperSegments", () => {
  it("fills every segment up to and including the current step", () => {
    expect(stepperSegments(1)).toEqual([true, true, false, false, false]);
  });

  it("is one segment per step, the first filled on the first step", () => {
    expect(stepperSegments(0, 3)).toEqual([true, false, false]);
  });
});
