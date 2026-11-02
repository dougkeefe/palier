import { describe, expect, it } from "vitest";

import { NO_RESULTS, targetsOf } from "../../lib/study";
import {
  BRING_WAYS,
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL,
  choicesFrom,
  perSkillTargetsOpen,
  profileFrom,
  readySummary,
  sceneFor,
  skippable,
  stepAfter,
  stepBefore,
  stepDots,
  stepsFor,
  testDateInstant,
} from "./onboarding";

describe("onboarding steps (D269)", () => {
  it("has six steps: a welcome, the target, the results held, the goal, the key, and a ready card", () => {
    expect(ONBOARDING_STEPS).toEqual(["welcome", "target", "now", "goal", "key", "ready"]);
    expect(ONBOARDING_TOTAL).toBe(6);
  });

  it("takes continuing from the welcome to mean a new user: no step asks about bringing progress (D271)", () => {
    expect(stepAfter("welcome", false)).toBe("target");
    expect(BRING_WAYS).toEqual(["import", "pair"]);
  });

  it("asks nothing about an assessment: there is no placement step", () => {
    expect(ONBOARDING_STEPS).not.toContain("placement");
  });

  it("goes forward one step at a time, and ends on the ready card", () => {
    expect(stepsFor(false)).toEqual(ONBOARDING_STEPS);
    expect(stepAfter("target", false)).toBe("now");
    expect(stepAfter("now", false)).toBe("goal");
    expect(stepAfter("goal", false)).toBe("key");
    expect(stepAfter("key", false)).toBe("ready");
    expect(stepAfter("ready", false)).toBeNull();
  });

  it("leaves the key step out when this browser already holds a key, going from the goal to the ready card", () => {
    expect(stepsFor(true)).toEqual(["welcome", "target", "now", "goal", "ready"]);
    expect(stepAfter("goal", true)).toBe("ready");
  });

  it("goes back one step at a time, and nowhere before the welcome", () => {
    expect(stepBefore("ready", false)).toBe("key");
    expect(stepBefore("key", false)).toBe("goal");
    expect(stepBefore("target", false)).toBe("welcome");
    expect(stepBefore("welcome", false)).toBeNull();
  });

  it("goes back from the ready card to the goal when a key is held, never to the key step it left out", () => {
    expect(stepBefore("ready", true)).toBe("goal");
  });
});

describe("skippable (D269)", () => {
  it("offers Skip from the results on, once the target is given", () => {
    expect(skippable("now")).toBe(true);
    expect(skippable("goal")).toBe(true);
    expect(skippable("key")).toBe(true);
  });

  it("offers no Skip before the target is chosen, nor on the ready card, whose own button finishes", () => {
    expect(skippable("welcome")).toBe(false);
    expect(skippable("target")).toBe(false);
    expect(skippable("ready")).toBe(false);
  });
});

describe("sceneFor (D269)", () => {
  it("heads every step with Coco in a scene, each its own", () => {
    const scenes = ["welcome", "target", "goal", "key", "ready"].map((step) => sceneFor(step as "welcome"));
    expect(scenes).toEqual(["hello", "summit", "time", "key", "celebrate"]);
  });

  it("draws none over the results, whose staircases already carry Coco", () => {
    expect(sceneFor("now")).toBeNull();
  });
});

describe("stepDots", () => {
  it("marks the steps behind, the one shown and the ones ahead", () => {
    expect(stepDots(2)).toEqual(["past", "past", "current", "next", "next", "next"]);
  });

  it("is one dot per step shown, the first current on the first step", () => {
    expect(stepDots(0, 5)).toEqual(["current", "next", "next", "next", "next"]);
  });
});

describe("what onboarding starts from and produces", () => {
  it("defaults a user who skips to C everywhere, no results, 20 minutes and no date", () => {
    expect(DEFAULT_CHOICES).toEqual({ targets: targetsOf("C"), current: NO_RESULTS, testDate: null, dailyGoalMinutes: 20 });
  });

  it("starts from the defaults with no profile saved", () => {
    expect(choicesFrom(null)).toBe(DEFAULT_CHOICES);
  });

  it("starts from a saved profile, so finishing again never overwrites it with the defaults (WCAG 3.3.7)", () => {
    const profile = {
      targets: { reading: "B", writing: "C", oral: "B" },
      current: { reading: "E", writing: null, oral: "A" },
      dailyGoalMinutes: 10,
      testDate: "2027-02-14",
    } as const;
    expect(choicesFrom(profile)).toEqual(profile);
  });

  it("stores the targets, results, goal and test date", () => {
    const targets = { reading: "C", writing: "B", oral: "C" } as const;
    const current = { reading: "E", writing: null, oral: "B" } as const;
    expect(profileFrom({ ...DEFAULT_CHOICES, targets, current, testDate: "2026-12-01", dailyGoalMinutes: 30 })).toEqual({
      targets,
      current,
      dailyGoalMinutes: 30,
      testDate: "2026-12-01",
    });
  });

  it("treats an emptied date field as no test date", () => {
    expect(profileFrom({ ...DEFAULT_CHOICES, testDate: "" }).testDate).toBeNull();
  });
});

describe("readySummary (D269)", () => {
  it("names one target when every skill shares it, and lists no results when none is declared", () => {
    expect(readySummary(DEFAULT_CHOICES, false)).toEqual({
      target: "C",
      targets: targetsOf("C"),
      results: [],
      dailyGoalMinutes: 20,
      testDate: null,
      keyHeld: false,
    });
  });

  it("names no single target when they differ, so the card lists each", () => {
    const summary = readySummary({ ...DEFAULT_CHOICES, targets: { reading: "C", writing: "B", oral: "C" } }, true);
    expect(summary.target).toBeNull();
    expect(summary.targets.writing).toBe("B");
    expect(summary.keyHeld).toBe(true);
  });

  it("lists the results declared in the skills' order, leaving out the ones not yet held", () => {
    const summary = readySummary({ ...DEFAULT_CHOICES, current: { reading: null, writing: "C", oral: "E" } }, false);
    expect(summary.results).toEqual([
      { skill: "writing", band: "C" },
      { skill: "oral", band: "E" },
    ]);
  });

  it("treats an emptied date field as no test date", () => {
    expect(readySummary({ ...DEFAULT_CHOICES, testDate: "" }, false).testDate).toBeNull();
  });
});

describe("testDateInstant", () => {
  it("is noon UTC on the day, so the day named is the same across time zones", () => {
    expect(testDateInstant("2026-12-01").toISOString()).toBe("2026-12-01T12:00:00.000Z");
  });
});

describe("the per-skill targets' disclosure (D259)", () => {
  it("starts closed while one target describes every skill", () => {
    expect(perSkillTargetsOpen(false, targetsOf("C"))).toBe(false);
  });

  it("opens when the targets differ, so coming back to the step shows them", () => {
    expect(perSkillTargetsOpen(false, { reading: "C", writing: "B", oral: "C" })).toBe(true);
  });

  it("stays open once opened, even when the targets agree again", () => {
    expect(perSkillTargetsOpen(true, targetsOf("C"))).toBe(true);
  });
});
