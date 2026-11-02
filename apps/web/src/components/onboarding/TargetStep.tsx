"use client";

import { SKILLS, type TargetBand } from "@palier/domain";
import { useTranslations } from "next-intl";
import type { Ref } from "react";

import { type OnboardingChoices, perSkillTargetsOpen } from "../../features/onboarding/onboarding";
import { TARGET_CHOICES } from "../../features/study/levels";
import { oneTarget, targetsOf } from "../../lib/study";
import { TargetPicker } from "../study/LevelPickers";

/**
 * Onboarding's target (D259, D269): B or C as one answer, with a target per skill folded under it for a position whose
 * profile differs, and the optional test date. Once opened, the per-skill targets stay open (`perSkillTargetsOpen`).
 */
export function TargetStep({
  headingRef,
  choices,
  onChoose,
  perSkillOpen,
  onPerSkillToggle,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  choices: OnboardingChoices;
  onChoose: (over: Partial<OnboardingChoices>) => void;
  perSkillOpen: boolean;
  onPerSkillToggle: (open: boolean) => void;
}) {
  const t = useTranslations("start");
  const shared = oneTarget(choices.targets);
  const label = (band: TargetBand) => t(band === "B" ? "targetB" : "targetC");
  const hint = (band: TargetBand) => t(band === "B" ? "targetBHint" : "targetCHint");

  return (
    <fieldset className="app-fieldset">
      <legend className="app-onboarding__head">
        <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
          {t("targetHeading")}
        </h2>
      </legend>
      <p className="app-onboarding__head app-onboarding__lead">{t("targetIntro")}</p>
      <div className="app-onboarding__choices app-onboarding__choices--pair">
        {TARGET_CHOICES.map((band) => (
          <label key={band} className="app-choice">
            <input
              type="radio"
              name="target"
              value={band}
              checked={shared === band}
              onChange={() => onChoose({ targets: targetsOf(band) })}
            />
            <span className="app-choice__label">{label(band)}</span>
            <span className="app-choice__hint">{hint(band)}</span>
          </label>
        ))}
      </div>
      <details
        className="app-key-step__more"
        open={perSkillTargetsOpen(perSkillOpen, choices.targets)}
        onToggle={(event) => onPerSkillToggle(event.currentTarget.open)}
      >
        <summary>{t("targetPerSkill")}</summary>
        <div className="app-stack">
          <p className="app-muted">{t("targetPerSkillHint")}</p>
          {SKILLS.map((skill) => (
            <TargetPicker
              key={skill}
              skill={skill}
              value={choices.targets[skill]}
              onChange={(band) => onChoose({ targets: { ...choices.targets, [skill]: band } })}
            />
          ))}
        </div>
      </details>
      <label className="app-field">
        <span>{t("testDateLabel")}</span>
        <input
          type="date"
          className="app-input"
          value={choices.testDate ?? ""}
          onChange={(event) => onChoose({ testDate: event.target.value === "" ? null : event.target.value })}
        />
      </label>
    </fieldset>
  );
}
