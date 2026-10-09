import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  canSkipFrom,
  destinationFor,
  profileFrom,
  skipTarget,
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

  it("shows the key step whichever the placement, since the diagnostic runs on the key too (D220)", () => {
    expect(stepsFor(false)).toEqual(ONBOARDING_STEPS);
    expect(stepAfter("direction", false)).toBe("target");
    expect(stepAfter("goal", false)).toBe("key");
    expect(stepAfter("key", false)).toBeNull();
  });

  it("leaves the key step out when this browser already holds a key, so the goal is the last step", () => {
    expect(stepsFor(true)).toEqual(["direction", "target", "placement", "goal"]);
    expect(stepsFor(true)).toHaveLength(4);
    expect(stepAfter("goal", true)).toBeNull();
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

  it("skips past the preferences to the key step, not past it (D220)", () => {
    expect(skipTarget(false)).toBe("key");
  });

  it("finishes on a skip when a key is already held, since there is no key step to land on", () => {
    expect(skipTarget(true)).toBeNull();
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

  it("lands on the diagnostic when chosen with a key held, and on today's plan otherwise", () => {
    expect(destinationFor({ ...DEFAULT_CHOICES, placement: "diagnostic" }, { hasKey: true })).toBe("/diagnostic");
    expect(destinationFor(DEFAULT_CHOICES, { hasKey: true })).toBe("/home");
  });

  it("lands on today, not the diagnostic's gate, when the diagnostic was chosen and the key passed over", () => {
    expect(destinationFor({ ...DEFAULT_CHOICES, placement: "diagnostic" }, { hasKey: false })).toBe("/home");
    expect(destinationFor(DEFAULT_CHOICES, { hasKey: false })).toBe("/home");
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
