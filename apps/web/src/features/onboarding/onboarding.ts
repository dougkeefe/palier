import { SKILLS, type Band, type Skill, type TargetBand } from "@palier/domain";
import type { SceneName } from "@palier/ui";

import { type DailyGoal, NO_RESULTS, type StudyProfile, oneTarget, targetsOf } from "../../lib/study";

/**
 * Onboarding's shape (product-requirements.md §8.1, as the owner redrew it on 31 October 2026 and 1 November 2026,
 * progress.md D269–D271): a welcome, the target, the results already held (D259), the daily goal, the key, and a "you're
 * set" card that lands on today's plan. Continuing from the welcome means a new user; one bringing progress from a file
 * or another device says so by a quiet link under it. No assessment comes first: the diagnostic is no step here, only
 * an offer on Today, never a gate.
 *
 * The key step explains why Palier runs on the user's own key, what it costs and how to get one, and takes the key in
 * place (D220). It is left out only when this browser already holds a key, and stays skippable: drills, review and mock
 * exams need none.
 */
export const ONBOARDING_STEPS = ["welcome", "target", "now", "goal", "key", "ready"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Six, when the key step is shown. */
export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

/** The steps the wizard shows: the key step unless a key is already held. */
export const stepsFor = (hasKey: boolean): readonly OnboardingStep[] =>
  hasKey ? ONBOARDING_STEPS.filter((step) => step !== "key") : ONBOARDING_STEPS;

export const stepAfter = (step: OnboardingStep, hasKey: boolean): OnboardingStep | null => {
  const steps = stepsFor(hasKey);
  return steps[steps.indexOf(step) + 1] ?? null;
};

/** Back over the steps shown, so with a key held the ready card goes back to the goal, not a hidden key step. */
export const stepBefore = (step: OnboardingStep, hasKey: boolean): OnboardingStep | null => {
  const steps = stepsFor(hasKey);
  return steps[steps.indexOf(step) - 1] ?? null;
};

/**
 * Where "Skip" shows (D269): from the results on, once the one answer that shapes every plan, the target, is given, as
 * §8.1's "skippable after step 2" has it. Skipping saves what is chosen, with the defaults for the rest, and lands on
 * today's plan. Not on the ready card, whose own button does the same.
 */
const SKIPPABLE: ReadonlySet<OnboardingStep> = new Set(["now", "goal", "key"]);

export const skippable = (step: OnboardingStep): boolean => SKIPPABLE.has(step);

/**
 * The picture heading each step (D269): Coco in one of `@palier/ui`'s scenes. None on the results, whose three
 * staircases, Coco on each, are the picture already.
 */
const STEP_SCENES: Readonly<Record<OnboardingStep, SceneName | null>> = {
  welcome: "hello",
  target: "summit",
  now: null,
  goal: "time",
  key: "key",
  ready: "celebrate",
};

export const sceneFor = (step: OnboardingStep): SceneName | null => STEP_SCENES[step];

/**
 * The two ways to bring progress in (D271), offered in small type under the welcome, since the users they serve pick
 * themselves out: an export to import, or another device to link. Continuing past the welcome means a new user.
 */
export const BRING_WAYS = ["import", "pair"] as const;
export type BringWay = (typeof BRING_WAYS)[number];

/** A progress dot: a step behind, the one shown, or one ahead. The words beside the dots carry the step. */
export type StepDot = "past" | "current" | "next";

export const stepDots = (index: number, total: number = ONBOARDING_TOTAL): readonly StepDot[] =>
  Array.from({ length: total }, (_, i) => (i < index ? "past" : i === index ? "current" : "next"));

export type OnboardingChoices = {
  /** One answer sets all three; "different per skill", folded under it, sets each (D259). */
  readonly targets: StudyProfile["targets"];
  /** The results the user holds now, each "not yet" by default (D259). */
  readonly current: StudyProfile["current"];
  readonly testDate: string | null;
  readonly dailyGoalMinutes: DailyGoal;
};

/** The defaults a user who skips is left with: C everywhere, no results, no date, 20 minutes. */
export const DEFAULT_CHOICES: OnboardingChoices = {
  targets: targetsOf("C"),
  current: NO_RESULTS,
  testDate: null,
  dailyGoalMinutes: 20,
};

/**
 * Where the wizard starts (D269): a profile already saved, when one is, so coming back to `/start` shows what was
 * chosen rather than overwriting it with the defaults on finishing (WCAG 3.3.7, redundant entry).
 */
export const choicesFrom = (profile: StudyProfile | null): OnboardingChoices =>
  profile === null
    ? DEFAULT_CHOICES
    : {
        targets: profile.targets,
        current: profile.current,
        testDate: profile.testDate,
        dailyGoalMinutes: profile.dailyGoalMinutes,
      };

/**
 * Whether the target step's per-skill disclosure is open (D259): once the user has opened it, or
 * whenever the targets differ, so arriving back at the step shows them. Never closed by the targets
 * agreeing again, which would shut it under the user mid-choice.
 */
export const perSkillTargetsOpen = (opened: boolean, targets: StudyProfile["targets"]): boolean =>
  opened || oneTarget(targets) === null;

/** What onboarding stores. */
export const profileFrom = (choices: OnboardingChoices): StudyProfile => ({
  targets: choices.targets,
  current: choices.current,
  dailyGoalMinutes: choices.dailyGoalMinutes,
  testDate: choices.testDate === "" ? null : choices.testDate,
});

/** The ready card's summary (D269): what is about to be saved, in the order the steps asked it. */
export type ReadySummary = {
  /** One target for every skill, or null when they differ and `targets` says each. */
  readonly target: TargetBand | null;
  readonly targets: StudyProfile["targets"];
  /** The results declared, in the skills' order; none is an empty list. */
  readonly results: readonly { readonly skill: Skill; readonly band: Band }[];
  readonly dailyGoalMinutes: DailyGoal;
  readonly testDate: string | null;
  readonly keyHeld: boolean;
};

export const readySummary = (choices: OnboardingChoices, keyHeld: boolean): ReadySummary => ({
  target: oneTarget(choices.targets),
  targets: choices.targets,
  results: SKILLS.flatMap((skill) => {
    const band = choices.current[skill];
    return band === null ? [] : [{ skill, band }];
  }),
  dailyGoalMinutes: choices.dailyGoalMinutes,
  testDate: choices.testDate === "" ? null : choices.testDate,
  keyHeld,
});

/**
 * A `YYYY-MM-DD` test date as an instant to format: noon UTC that day, so the day named is the same in every time zone
 * from UTC−12 to UTC+11.
 */
export const testDateInstant = (date: string): Date => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
};
