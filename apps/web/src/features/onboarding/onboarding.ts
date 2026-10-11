import type { TargetBand } from "@palier/domain";

import type { DailyGoal, StudyProfile } from "../../lib/study";

/**
 * Onboarding's shape (product-requirements.md §8.1, in the owner's order of 10 October 2026, progress.md
 * D224): direction, target, daily goal, the key, and last the placement, whose choice is where the
 * wizard lands.
 *
 * The key step explains why Palier runs on the user's own key, what it costs and how to get one, and
 * takes the key in place (D220). It is left out only when this browser already holds a key, and stays
 * skippable: drills, review and mock exams need none.
 */
export const ONBOARDING_STEPS = ["direction", "target", "goal", "key", "placement"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** §8.1's five, when the key step is shown. */
export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

/**
 * The stepper's segments (progress.md D202): one per step, filled up to and including the step at
 * `index`. The words beside it carry the step, so the bar is decoration.
 */
export const stepperSegments = (index: number, total: number = ONBOARDING_TOTAL): readonly boolean[] =>
  Array.from({ length: total }, (_, i) => i <= index);

export type Placement = "diagnostic" | "skip";

/** The steps the wizard shows: the key step unless a key is already held, on either path. */
export const stepsFor = (hasKey: boolean): readonly OnboardingStep[] =>
  hasKey ? ONBOARDING_STEPS.filter((step) => step !== "key") : ONBOARDING_STEPS;

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

export const stepAfter = (step: OnboardingStep, hasKey: boolean): OnboardingStep | null => {
  const steps = stepsFor(hasKey);
  return steps[steps.indexOf(step) + 1] ?? null;
};

/** Back over the steps shown, so with a key held the placement goes back to the goal, not a hidden key step. */
export const stepBefore = (step: OnboardingStep, hasKey: boolean): OnboardingStep | null => {
  const steps = stepsFor(hasKey);
  return steps[steps.indexOf(step) - 1] ?? null;
};

/** The last step's button, a message key in `start`: it names the diagnostic when that is where it goes (D224). */
export const finishLabel = (placement: Placement): "finish" | "finishDiagnostic" =>
  placement === "diagnostic" ? "finishDiagnostic" : "finish";

/** What onboarding stores. The placement choice is a destination, not a setting. */
export const profileFrom = (choices: OnboardingChoices): StudyProfile => ({
  targetBand: choices.targetBand,
  dailyGoalMinutes: choices.dailyGoalMinutes,
  testDate: choices.testDate === "" ? null : choices.testDate,
});

/**
 * Where onboarding lands (D224): the diagnostic when chosen, otherwise today's plan. The placement is
 * the last step, so a diagnostic chosen is taken at once, key or not. With no key held, the
 * diagnostic's own gate asks for one and comes back (ADR 25); the user chose the diagnostic after the
 * key step, so that gate answers the choice rather than repeating a question just declined.
 */
export const destinationFor = (choices: OnboardingChoices): "/diagnostic" | "/home" =>
  choices.placement === "diagnostic" ? "/diagnostic" : "/home";
