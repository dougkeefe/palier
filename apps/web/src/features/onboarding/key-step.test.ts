import type { FeatureCost } from "@palier/app";
import { describe, expect, it } from "vitest";

import { KEY_STEP_FEATURES, keyStepCosts, keyStepFinish } from "./key-step";

const priced: readonly FeatureCost[] = [
  { feature: "writing-feedback", estimateUsd: 0.015 },
  { feature: "item-generation", estimateUsd: 0.048 },
  { feature: "oral-practice", estimateUsd: 0.0076 },
  { feature: "oral-assessment", estimateUsd: 0.016 },
  { feature: "oral-studio", estimateUsd: 0.06 },
  { feature: "diagnostic-interpretation", estimateUsd: 0.015 },
];

describe("keyStepCosts — what a key costs, on onboarding's key step", () => {
  it("lists the step's features in its own order, not the settings table's", () => {
    expect(keyStepCosts(priced).map((cost) => cost.feature)).toEqual([...KEY_STEP_FEATURES]);
  });

  it("carries each feature's estimate through unchanged", () => {
    expect(keyStepCosts(priced).find((cost) => cost.feature === "writing-feedback")?.estimateUsd).toBe(0.015);
  });

  it("marks the two spoken features as a minute's cost, and the rest as one use", () => {
    const perMinute = keyStepCosts(priced).filter((cost) => cost.perMinute).map((cost) => cost.feature);
    expect(perMinute).toEqual(["oral-practice", "oral-studio"]);
  });

  it("leaves out a feature whose model is unpriced, rather than showing it as free", () => {
    const unpriced = priced.map((cost) => (cost.feature === "oral-studio" ? { ...cost, estimateUsd: null } : cost));
    expect(keyStepCosts(unpriced).map((cost) => cost.feature)).not.toContain("oral-studio");
  });

  it("leaves out a feature the costs do not name at all", () => {
    expect(keyStepCosts(priced.filter((cost) => cost.feature !== "item-generation")).map((cost) => cost.feature)).not.toContain(
      "item-generation",
    );
  });
});

describe("keyStepFinish — the key step's way on", () => {
  it("offers a quiet skip that names itself while no key is saved", () => {
    expect(keyStepFinish({ held: false, placement: "skip" })).toEqual({ label: "keySkip", primary: false });
  });

  it("says the diagnostic waits on today when the key is passed over on the diagnostic path", () => {
    expect(keyStepFinish({ held: false, placement: "diagnostic" })).toEqual({ label: "keySkipDiagnostic", primary: false });
  });

  it("finishes the wizard as its primary action once a key is saved on the skip path", () => {
    expect(keyStepFinish({ held: true, placement: "skip" })).toEqual({ label: "finish", primary: true });
  });

  it("leads on to the diagnostic once a key is saved on the diagnostic path", () => {
    expect(keyStepFinish({ held: true, placement: "diagnostic" })).toEqual({ label: "keyFinishDiagnostic", primary: true });
  });
});
