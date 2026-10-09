import type { TargetBand } from "@palier/domain";

import type { DailyGoal, StudyProfile } from "../../lib/study";

/**
 * Onboarding's shape (product-requirements.md §8.1): direction, target, placement,
 * daily goal, and step 5, the key.
 *
 * Step 5 explains why Palier runs on the user's own key, what it costs and how to get one, and takes
 * the key in place (progress.md D220, the owner's request, superseding D100's "skip path only"). It is
 * shown on **both** paths, since the diagnostic runs on the key too (ADR 25), and left out only when
 * this browser already holds a key. It stays skippable: drills, review and mock exams need none.
 */
export const ONBOARDING_STEPS = ["direction", "target", "placement", "goal", "key"] as const;
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

export const stepBefore = (step: OnboardingStep): OnboardingStep | null =>
  ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) - 1] ?? null;

/** §8.1: "Five steps, skippable after step 2" — so once the target is chosen. */
export const canSkipFrom = (step: OnboardingStep): boolean =>
  ONBOARDING_STEPS.indexOf(step) >= ONBOARDING_STEPS.indexOf("placement");

/**
 * Where "Skip for now" goes from the placement or the goal (D220): past the preferences to the key
 * step, the one worth seeing, or, with a key already held, nowhere, so the wizard finishes.
 */
export const skipTarget = (hasKey: boolean): "key" | null => (hasKey ? null : "key");

/** What onboarding stores. The placement choice is a destination, not a setting. */
export const profileFrom = (choices: OnboardingChoices): StudyProfile => ({
  targetBand: choices.targetBand,
  dailyGoalMinutes: choices.dailyGoalMinutes,
  testDate: choices.testDate === "" ? null : choices.testDate,
});

/**
 * Where onboarding lands: the diagnostic if chosen and a key is held, otherwise today's plan. The key
 * is taken in step 5 itself (D220), so onboarding never leaves for the key screen. A diagnostic chosen
 * with the key passed over lands on today, which leads with the diagnostic as its next step (D214),
 * rather than on the diagnostic's gate asking for the key the user just declined.
 */
export const destinationFor = (
  choices: OnboardingChoices,
  { hasKey }: { readonly hasKey: boolean },
): "/diagnostic" | "/home" => (choices.placement === "diagnostic" && hasKey ? "/diagnostic" : "/home");
