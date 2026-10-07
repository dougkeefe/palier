import type { SkillTrend } from "@palier/engine";
import { describe, expect, it } from "vitest";

import { type NextStepInput, nextStep, practisedAtTarget } from "./next-step";

const estimated = { status: "estimated", attempted: 30, correct: 21, accuracy: 0.7, interval: { low: 0.52, high: 0.83 } } as const;
const insufficient = { status: "insufficient", attempted: 12, needed: 30 } as const;

const trendWith = (c: SkillTrend["byBand"]["C"], b: SkillTrend["byBand"]["B"] = insufficient): SkillTrend => ({
  skill: "reading",
  windowSize: 60,
  byBand: { A: insufficient, B: b, C: c },
});

const TAKEN = "2026-10-01T12:00:00.000Z";

const input = (over: Partial<NextStepInput> = {}): NextStepInput => ({
  diagnostic: { takenAt: TAKEN, retakeDue: false },
  trend: trendWith(insufficient),
  targetBand: "C",
  mockExamAdvised: false,
  lastExamAt: null,
  ...over,
});

describe("nextStep", () => {
  it("starts with the diagnostic while no run has placed the plan, whatever else is true", () => {
    expect(nextStep(input({ diagnostic: null }))).toBe("diagnostic");
    expect(nextStep(input({ diagnostic: null, trend: trendWith(estimated), mockExamAdvised: true }))).toBe("diagnostic");
  });

  it("is the plan itself after the diagnostic, while practice at the target is not yet measurable", () => {
    expect(nextStep(input())).toBe("plan");
  });

  it("offers a mock exam once the trend has an estimate at the target band", () => {
    expect(nextStep(input({ trend: trendWith(estimated) }))).toBe("mock-exam");
  });

  it("does not count an estimate below the target: B measured is not C practised", () => {
    expect(nextStep(input({ trend: trendWith(insufficient, estimated) }))).toBe("plan");
    expect(nextStep(input({ targetBand: "B", trend: trendWith(insufficient, estimated) }))).toBe("mock-exam");
  });

  it("offers a mock exam while the planner advises one before the test, measurable or not", () => {
    expect(nextStep(input({ mockExamAdvised: true }))).toBe("mock-exam");
  });

  it("offers the mock exam once per diagnostic: an exam at this skill since the run means it was taken", () => {
    const ready = { trend: trendWith(estimated), mockExamAdvised: true };
    expect(nextStep(input({ ...ready, lastExamAt: "2026-10-03T09:00:00.000Z" }))).toBe("plan");
    expect(nextStep(input({ ...ready, lastExamAt: TAKEN }))).toBe("plan");
    expect(nextStep(input({ ...ready, lastExamAt: "2026-09-20T09:00:00.000Z" }))).toBe("mock-exam");
  });

  it("puts a due retake ahead of the mock exam, so the exam follows a current placement", () => {
    expect(nextStep(input({ diagnostic: { takenAt: TAKEN, retakeDue: true }, trend: trendWith(estimated) }))).toBe(
      "retake-diagnostic",
    );
  });
});

describe("practisedAtTarget", () => {
  it("is true only when the target band itself has an estimate", () => {
    expect(practisedAtTarget(trendWith(estimated), "C")).toBe(true);
    expect(practisedAtTarget(trendWith(insufficient, estimated), "C")).toBe(false);
  });
});
