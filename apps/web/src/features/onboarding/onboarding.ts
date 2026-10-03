import type { TargetBand } from "@palier/domain";

import type { DailyGoal, StudyProfile } from "../../lib/study";

/**
 * Onboarding's shape (product-requirements.md §8.1): direction, target, placement,
 * daily goal, and step 5, the optional API key.
 *
 * "Diagnostic before key, always" (§8.1), so step 5's place depends on the placement
 * (progress.md D100). On the **diagnostic** path the wizard ends at the goal, and step 5 is
 * offered on the diagnostic's readout. On the **skip** path there is no diagnostic, and
 * step 5 is the wizard's own last step. Either way the count reads "of 5".
 */
export const ONBOARDING_STEPS = ["direction", "target", "placement", "goal", "key"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** §8.1's five, whichever path shows the fifth. */
export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

/**
 * The stepper's segments (progress.md D202): one per step, filled up to and including the step at
 * `index`. The words beside it carry the step, so the bar is decoration.
 */
export const stepperSegments = (index: number, total: number = ONBOARDING_TOTAL): readonly boolean[] =>
  Array.from({ length: total }, (_, i) => i <= index);

export type Placement = "diagnostic" | "skip";

/** The steps the wizard itself shows on a path: the key step only where no diagnostic follows. */
export const stepsFor = (placement: Placement): readonly OnboardingStep[] =>
  placement === "diagnostic" ? ONBOARDING_STEPS.filter((step) => step !== "key") : ONBOARDING_STEPS;

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

export const stepAfter = (step: OnboardingStep, placement: Placement): OnboardingStep | null => {
  const steps = stepsFor(placement);
  return steps[steps.indexOf(step) + 1] ?? null;
};

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

/**
 * Where onboarding lands: the key screen when step 5's "Add a key now" was chosen, else the
 * diagnostic if chosen, otherwise today's plan. The profile is written first either way, so
 * leaving for the key screen never loses it.
 */
export const destinationFor = (
  choices: OnboardingChoices,
  { addKey = false }: { readonly addKey?: boolean } = {},
): "/diagnostic" | "/home" | "/settings/key" => {
  if (addKey) return "/settings/key";
  return choices.placement === "diagnostic" ? "/diagnostic" : "/home";
};
