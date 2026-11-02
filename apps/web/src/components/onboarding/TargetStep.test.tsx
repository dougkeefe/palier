import { describe, expect, it } from "vitest";

import { html } from "../../__tests__/render";
import { DEFAULT_CHOICES, type OnboardingChoices } from "../../features/onboarding/onboarding";
import { TargetStep } from "./TargetStep";

// Rendered in node: choosing is the wizard's jsdom test's (`OnboardingWizard.test.tsx` saves a Level B chosen here).
const step = (choices: OnboardingChoices = DEFAULT_CHOICES, perSkillOpen = false) =>
  html(
    <TargetStep
      headingRef={null}
      choices={choices}
      onChoose={() => undefined}
      perSkillOpen={perSkillOpen}
      onPerSkillToggle={() => undefined}
    />,
  );

/** The value of every checked radio named `name`, in order. */
const checked = (markup: string, name: string) =>
  [...markup.matchAll(/<input[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes(`name="${name}"`) && tag.includes('checked=""'))
    .map((tag) => /value="([^"]*)"/.exec(tag)?.[1]);

describe("TargetStep (D259, D269)", () => {
  it("asks B or C as one answer, with the shared target chosen", () => {
    const markup = step();
    expect(markup).toContain("What are you aiming for?");
    expect(checked(markup, "target")).toEqual(["C"]);
  });

  it("chooses neither shared answer when the skills differ, and opens the per-skill targets to show them", () => {
    const markup = step({ ...DEFAULT_CHOICES, targets: { reading: "C", writing: "B", oral: "C" } });
    expect(checked(markup, "target")).toEqual([]);
    expect(markup).toMatch(/<details[^>]*open=""/);
    expect(checked(markup, "target-writing")).toEqual(["B"]);
  });

  it("keeps the per-skill targets closed while one target describes every skill and they were never opened", () => {
    expect(step()).not.toMatch(/<details[^>]*open=""/);
  });

  it("shows a booked test date, and none as an empty field", () => {
    expect(step({ ...DEFAULT_CHOICES, testDate: "2027-01-05" })).toMatch(/type="date"[^>]*value="2027-01-05"/);
    expect(step()).toMatch(/type="date"[^>]*value=""/);
  });
});
