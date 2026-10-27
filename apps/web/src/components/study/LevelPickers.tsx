"use client";

import type { Band, Skill, TargetBand } from "@palier/domain";
import { LevelStairPicker } from "@palier/ui";
import { useTranslations } from "next-intl";

import { TARGET_CHOICES, stairMessage } from "../../features/study/levels";

/**
 * The study profile's level pickers (progress.md D259), shared by onboarding and the study settings:
 * a skill's result held, picked on its staircase by tapping a step (D263), and a skill's target.
 * Real radio inputs, so the keyboard and a screen reader get the platform's behaviour.
 */

/** A skill's name, in the interface's language: speaking is named by Today's key, as everywhere. */
export function useSkillName(): (skill: Skill) => string {
  const tSkills = useTranslations("skills");
  const tToday = useTranslations("today");
  return (skill) => (skill === "oral" ? tToday("oralName") : tSkills(skill));
}

/** What a skill's staircase says, in words, for its label or the line beside it. */
export function useStairText(): (skill: Skill, current: Band | null, target: TargetBand, exemptBand: Band) => string {
  const t = useTranslations("levels");
  const skillName = useSkillName();
  return (skill, current, target, exemptBand) =>
    t(stairMessage(current, exemptBand), { skill: skillName(skill), current: current ?? "", target });
}

export function ResultPicker({
  skill,
  value,
  target,
  bands,
  exemptBand,
  onChange,
}: {
  skill: Skill;
  value: Band | null;
  target: TargetBand;
  bands: readonly Band[];
  exemptBand: Band;
  onChange: (band: Band | null) => void;
}) {
  const t = useTranslations("levels");
  const skillName = useSkillName();
  const stairText = useStairText();
  return (
    <LevelStairPicker
      bands={bands}
      current={value}
      target={target}
      legend={skillName(skill)}
      name={`result-${skill}`}
      notYetLabel={t("notYet")}
      caption={stairText(skill, value, target, exemptBand)}
      onChange={onChange}
      {...(value === exemptBand ? { stamp: t("stamp") } : {})}
    />
  );
}

export function TargetPicker({
  skill,
  value,
  onChange,
}: {
  skill: Skill;
  value: TargetBand;
  onChange: (band: TargetBand) => void;
}) {
  const t = useTranslations("levels");
  const skillName = useSkillName();
  return (
    <fieldset className="app-segmented">
      <legend className="app-segmented__legend">{skillName(skill)}</legend>
      {TARGET_CHOICES.map((band) => (
        <label key={band} className="app-segmented__option">
          <input type="radio" name={`target-${skill}`} value={band} checked={value === band} onChange={() => onChange(band)} />
          {t("targetOption", { band })}
        </label>
      ))}
    </fieldset>
  );
}
