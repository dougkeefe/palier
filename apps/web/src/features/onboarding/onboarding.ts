import type { TargetBand } from "@palier/domain";

import type { DailyGoal, StudyProfile } from "../../lib/study";

/**
 * Onboarding's shape (product-requirements.md §8.1): direction, target, placement,
 * daily goal. Step 5, the optional API key, belongs to Phase 4, where keys arrive; the
 * app is complete without it (§8.1: "diagnostic before key, always").
 */
export const ONBOARDING_STEPS = ["direction", "target", "placement", "goal"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type Placement = "diagnostic" | "skip";

export type OnboardingChoices = {
  readonly targetBand: TargetBand;
  readonly testDate: string | null;
  readonly placement: Placement;
  readonly dailyGoalMinutes: DailyGoal;
};

/** The defaults a user who skips is left with: C, no date, no diagnostic, 20 minutes. */
export const DEFAULT_CHOICES: OnboardingChoices = {
  targetBand: "C",
  testDate: null,
  placement: "skip",
  dailyGoalMinutes: 20,
};

export const stepAfter = (step: OnboardingStep): OnboardingStep | null =>
  ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;

export const stepBefore = (step: OnboardingStep): OnboardingStep | null =>
  ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) - 1] ?? null;

/** §8.1: "Five steps, skippable after step 2" — so once the target is chosen. */
export const canSkipFrom = (step: OnboardingStep): boolean =>
  ONBOARDING_STEPS.indexOf(step) >= ONBOARDING_STEPS.indexOf("placement");

/** What onboarding stores. The placement choice is a destination, not a setting. */
export const profileFrom = (choices: OnboardingChoices): StudyProfile => ({
  targetBand: choices.targetBand,
  dailyGoalMinutes: choices.dailyGoalMinutes,
  testDate: choices.testDate === "" ? null : choices.testDate,
});

/** Where onboarding lands: the diagnostic if chosen, otherwise today's plan. */
export const destinationFor = (choices: OnboardingChoices): "/diagnostic" | "/home" =>
  choices.placement === "diagnostic" ? "/diagnostic" : "/home";
