import { SCORED_SKILLS, type Band } from "@palier/domain";
import { skillStanding } from "@palier/engine";

import { type DailyGoal, NO_RESULTS, type StudyProfile, targetsOf } from "../../lib/study";

/**
 * Onboarding's shape (product-requirements.md §8.1, in the owner's order of 10 October 2026, progress.md
 * D224): direction, target, the results already held (D259, §8.1's "self-declare a current profile"),
 * daily goal, the key, and last the placement, whose choice is where the wizard lands.
 *
 * The key step explains why Palier runs on the user's own key, what it costs and how to get one, and
 * takes the key in place (D220). It is left out only when this browser already holds a key, and stays
 * skippable: drills, review and mock exams need none.
 */
export const ONBOARDING_STEPS = ["direction", "target", "now", "goal", "key", "placement"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Six, when the key step is shown: §8.1's five and the results held (D259). */
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
  /** One answer sets all three; "different per skill", folded under it, sets each (D259). */
  readonly targets: StudyProfile["targets"];
  /** The results the user holds now, each "not yet" by default (D259). */
  readonly current: StudyProfile["current"];
  readonly testDate: string | null;
  readonly placement: Placement;
  readonly dailyGoalMinutes: DailyGoal;
};

/** The defaults a user who skips is left with: C everywhere, no results, no date, no diagnostic, 20 minutes. */
export const DEFAULT_CHOICES: OnboardingChoices = {
  targets: targetsOf("C"),
  current: NO_RESULTS,
  testDate: null,
  placement: "skip",
  dailyGoalMinutes: 20,
};

/**
 * Whether the diagnostic has anything to place (D259): a scored skill with no result declared, or
 * one below its target. A skill held at its target or exempt has nothing to place, so with both
 * reading and writing that way the placement step offers only to start practising.
 */
export const offersDiagnostic = (choices: Pick<OnboardingChoices, "targets" | "current">, exemptBand: Band): boolean =>
  SCORED_SKILLS.some((skill) => {
    const standing = skillStanding({ current: choices.current[skill], target: choices.targets[skill], exemptBand });
    return standing === "unknown" || standing === "working";
  });

/** The placements the last step offers: the diagnostic only when it has something to place. */
export const placementsFor = (choices: OnboardingChoices, exemptBand: Band): readonly Placement[] =>
  offersDiagnostic(choices, exemptBand) ? ["diagnostic", "skip"] : ["skip"];

/** The choices as they finish: a diagnostic chosen and then made pointless by a result reads as a skip. */
export const settle = (choices: OnboardingChoices, exemptBand: Band): OnboardingChoices =>
  placementsFor(choices, exemptBand).includes(choices.placement) ? choices : { ...choices, placement: "skip" };

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
  targets: choices.targets,
  current: choices.current,
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
