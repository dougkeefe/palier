"use client";

import type { ScoredSkill } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import { Button } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DIAGNOSTIC_SIZE } from "../../lib/study";
import { PracticeSession } from "../practice/PracticeSession";

/**
 * The diagnostic's front door (product-requirements.md §6.2): pick a skill, then run
 * the coverage sample for it. One skill at a time, so a user can stop after reading
 * and come back for writing.
 */
export function DiagnosticLauncher() {
  const t = useTranslations("diagnostic");
  const tSkills = useTranslations("skills");
  const [skill, setSkill] = useState<ScoredSkill>("reading");
  const [started, setStarted] = useState(false);

  if (started) return <PracticeSession skill={skill} mode="diagnostic" />;

  return (
    <form
      className="app-stack"
      onSubmit={(event) => {
        event.preventDefault();
        setStarted(true);
      }}
    >
      <p>{t("intro", { count: DIAGNOSTIC_SIZE })}</p>
      <fieldset className="app-fieldset">
        <legend>{t("chooseSkill")}</legend>
        {SCORED_SKILLS.map((s) => (
          <label key={s} className="app-choice">
            <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
            <span className="app-choice__label">{tSkills(s)}</span>
          </label>
        ))}
      </fieldset>
      <div className="app-actions">
        <Button type="submit">{t("start", { skill: tSkills(skill) })}</Button>
      </div>
    </form>
  );
}
