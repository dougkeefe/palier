"use client";

import { useTranslations } from "next-intl";
import type { Ref } from "react";

import type { OnboardingChoices } from "../../features/onboarding/onboarding";
import { DAILY_GOALS, type DailyGoal } from "../../lib/study";

/** Each goal's pace, a message key in `start`. */
const PACE: Readonly<Record<DailyGoal, "goalPace10" | "goalPace20" | "goalPace30">> = {
  10: "goalPace10",
  20: "goalPace20",
  30: "goalPace30",
};

/** Onboarding's daily goal (§8.1 step 4): three tiles, each the minutes and the pace they keep (D269). */
export function GoalStep({
  headingRef,
  choices,
  onChoose,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  choices: OnboardingChoices;
  onChoose: (over: Partial<OnboardingChoices>) => void;
}) {
  const t = useTranslations("start");
  return (
    <fieldset className="app-fieldset">
      <legend className="app-onboarding__head">
        <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
          {t("goalHeading")}
        </h2>
      </legend>
      <div className="app-onboarding__choices app-onboarding__choices--tiles">
        {DAILY_GOALS.map((minutes) => (
          <label key={minutes} className="app-choice app-choice--tile">
            <input
              type="radio"
              name="goal"
              value={minutes}
              checked={choices.dailyGoalMinutes === minutes}
              onChange={() => onChoose({ dailyGoalMinutes: minutes })}
            />
            <span className="app-choice__label">{t("goalOption", { minutes })}</span>
            <span className="app-choice__hint">{t(PACE[minutes])}</span>
          </label>
        ))}
      </div>
      <p className="app-muted app-onboarding__head">{t("goalHint")}</p>
    </fieldset>
  );
}
