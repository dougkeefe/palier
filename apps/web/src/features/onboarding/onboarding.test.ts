import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  destinationFor,
  finishLabel,
  profileFrom,
  stepAfter,
  stepBefore,
  stepperSegments,
  stepsFor,
} from "./onboarding";

describe("onboarding steps", () => {
  it("has five steps in the owner's order: direction, target, goal, the key, and the placement last (D224)", () => {
    expect(ONBOARDING_STEPS).toEqual(["direction", "target", "goal", "key", "placement"]);
    expect(ONBOARDING_TOTAL).toBe(5);
  });

  it("asks for the key before the placement, and ends on the placement", () => {
    expect(stepsFor(false)).toEqual(ONBOARDING_STEPS);
    expect(stepAfter("direction", false)).toBe("target");
    expect(stepAfter("target", false)).toBe("goal");
    expect(stepAfter("goal", false)).toBe("key");
    expect(stepAfter("key", false)).toBe("placement");
    expect(stepAfter("placement", false)).toBeNull();
  });

  it("leaves the key step out when this browser already holds a key, going from the goal to the placement", () => {
    expect(stepsFor(true)).toEqual(["direction", "target", "goal", "placement"]);
    expect(stepAfter("goal", true)).toBe("placement");
    expect(stepAfter("placement", true)).toBeNull();
  });

  it("goes back one step at a time, and nowhere before the first", () => {
    expect(stepBefore("placement", false)).toBe("key");
    expect(stepBefore("key", false)).toBe("goal");
    expect(stepBefore("goal", false)).toBe("target");
    expect(stepBefore("direction", false)).toBeNull();
  });

  it("goes back from the placement to the goal when a key is held, never to the key step it left out", () => {
    expect(stepBefore("placement", true)).toBe("goal");
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

  it("lands on the diagnostic when it is chosen, and on today's plan otherwise (D224)", () => {
    expect(destinationFor({ ...DEFAULT_CHOICES, placement: "diagnostic" })).toBe("/diagnostic");
    expect(destinationFor(DEFAULT_CHOICES)).toBe("/home");
  });

  it("names the diagnostic on the last step's button when it is chosen, and says start practising otherwise", () => {
    expect(finishLabel("diagnostic")).toBe("finishDiagnostic");
    expect(finishLabel("skip")).toBe("finish");
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
