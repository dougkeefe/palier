"use client";

import { SKILLS } from "@palier/domain";
import { useFormatter, useTranslations } from "next-intl";
import type { Ref } from "react";

import { type ReadySummary, testDateInstant } from "../../features/onboarding/onboarding";
import { useSkillName } from "../study/LevelPickers";

/**
 * Onboarding's last card (D269): "You're set", with what the plan is about to start from, read back in the steps'
 * order, before one button saves it and opens today's plan. No assessment is asked for here or before: the diagnostic
 * is Today's offer, never a gate.
 */
export function ReadyStep({ headingRef, summary }: { headingRef: Ref<HTMLHeadingElement>; summary: ReadySummary }) {
  const t = useTranslations("start");
  const format = useFormatter();
  const skillName = useSkillName();

  return (
    <div className="app-stack">
      <div className="app-onboarding__head">
        <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
          {t("readyHeading")}
        </h2>
        <p className="app-onboarding__lead">{t("readyIntro")}</p>
      </div>
      <dl className="app-onboarding__summary">
        <div>
          <dt>{t("readyTarget")}</dt>
          <dd>
            {summary.target === null
              ? SKILLS.map((skill) => t("readyTargetSkill", { skill: skillName(skill), band: summary.targets[skill] })).join(" · ")
              : t("readyTargetOne", { band: summary.target })}
          </dd>
        </div>
        <div>
          <dt>{t("readyResults")}</dt>
          <dd>
            {summary.results.length === 0
              ? t("readyResultsNone")
              : summary.results.map(({ skill, band }) => t("readyResultSkill", { skill: skillName(skill), band })).join(" · ")}
          </dd>
        </div>
        <div>
          <dt>{t("readyGoal")}</dt>
          <dd>{t("readyGoalValue", { minutes: summary.dailyGoalMinutes })}</dd>
        </div>
        {summary.testDate === null ? null : (
          <div>
            <dt>{t("readyTest")}</dt>
            <dd>{format.dateTime(testDateInstant(summary.testDate), { dateStyle: "long", timeZone: "UTC" })}</dd>
          </div>
        )}
        <div>
          <dt>{t("readyKey")}</dt>
          <dd>{t(summary.keyHeld ? "readyKeyHeld" : "readyKeyNone")}</dd>
        </div>
      </dl>
    </div>
  );
}
