import { describe, expect, it } from "vitest";

import { NO_RESULTS, targetsOf } from "../../lib/study";
import {
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  destinationFor,
  finishLabel,
  offersDiagnostic,
  placementsFor,
  profileFrom,
  settle,
  stepAfter,
  stepBefore,
  stepperSegments,
  stepsFor,
} from "./onboarding";

describe("onboarding steps", () => {
  it("has six steps: D224's order, with the results held after the target (D259)", () => {
    expect(ONBOARDING_STEPS).toEqual(["direction", "target", "now", "goal", "key", "placement"]);
    expect(ONBOARDING_TOTAL).toBe(6);
  });

  it("asks for the key before the placement, and ends on the placement", () => {
    expect(stepsFor(false)).toEqual(ONBOARDING_STEPS);
    expect(stepAfter("direction", false)).toBe("target");
    expect(stepAfter("target", false)).toBe("now");
    expect(stepAfter("now", false)).toBe("goal");
    expect(stepAfter("goal", false)).toBe("key");
    expect(stepAfter("key", false)).toBe("placement");
    expect(stepAfter("placement", false)).toBeNull();
  });

  it("leaves the key step out when this browser already holds a key, going from the goal to the placement", () => {
    expect(stepsFor(true)).toEqual(["direction", "target", "now", "goal", "placement"]);
    expect(stepAfter("goal", true)).toBe("placement");
    expect(stepAfter("placement", true)).toBeNull();
  });

  it("goes back one step at a time, and nowhere before the first", () => {
    expect(stepBefore("placement", false)).toBe("key");
    expect(stepBefore("key", false)).toBe("goal");
    expect(stepBefore("goal", false)).toBe("now");
    expect(stepBefore("now", false)).toBe("target");
    expect(stepBefore("direction", false)).toBeNull();
  });

  it("goes back from the placement to the goal when a key is held, never to the key step it left out", () => {
    expect(stepBefore("placement", true)).toBe("goal");
  });
});

describe("what onboarding produces", () => {
  it("stores the targets, results, goal and test date, but not the placement choice", () => {
    const targets = { reading: "C", writing: "B", oral: "C" } as const;
    const current = { reading: "E", writing: null, oral: "B" } as const;
    expect(
      profileFrom({ ...DEFAULT_CHOICES, targets, current, testDate: "2026-12-01", dailyGoalMinutes: 30 }),
    ).toEqual({ targets, current, dailyGoalMinutes: 30, testDate: "2026-12-01" });
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

  it("defaults a user who skips to C everywhere, no results, 20 minutes, no date and no diagnostic", () => {
    expect(DEFAULT_CHOICES).toEqual({
      targets: targetsOf("C"),
      current: NO_RESULTS,
      testDate: null,
      placement: "skip",
      dailyGoalMinutes: 20,
    });
  });
});

describe("the diagnostic offer, after the results held (D259)", () => {
  const held = (reading: "C" | "E" | "B" | null, writing: "C" | "E" | "B" | null) => ({
    ...DEFAULT_CHOICES,
    current: { reading, writing, oral: null },
  });

  it("offers the diagnostic with nothing declared, or a scored skill below its target", () => {
    expect(offersDiagnostic(DEFAULT_CHOICES, "E")).toBe(true);
    expect(offersDiagnostic(held("E", "B"), "E")).toBe(true);
    expect(placementsFor(held(null, "C"), "E")).toEqual(["diagnostic", "skip"]);
  });

  it("offers only to start practising when reading and writing are each held or exempt", () => {
    expect(offersDiagnostic(held("E", "C"), "E")).toBe(false);
    expect(placementsFor(held("C", "C"), "E")).toEqual(["skip"]);
  });

  it("ignores speaking, which has no diagnostic", () => {
    expect(offersDiagnostic({ ...held("E", "E"), current: { reading: "E", writing: "E", oral: "B" } }, "E")).toBe(false);
  });

  it("settles a diagnostic chosen and then made pointless as a skip, and leaves an offered one alone", () => {
    expect(settle({ ...held("E", "E"), placement: "diagnostic" }, "E").placement).toBe("skip");
    expect(settle({ ...DEFAULT_CHOICES, placement: "diagnostic" }, "E").placement).toBe("diagnostic");
  });
});

describe("stepperSegments", () => {
  it("fills every segment up to and including the current step", () => {
    expect(stepperSegments(1)).toEqual([true, true, false, false, false, false]);
  });

  it("is one segment per step, the first filled on the first step", () => {
    expect(stepperSegments(0, 3)).toEqual([true, false, false]);
  });
});
