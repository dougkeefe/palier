"use client";

import { SKILLS, type Band } from "@palier/domain";
import { useTranslations } from "next-intl";
import type { Ref } from "react";

import type { OnboardingChoices } from "../../features/onboarding/onboarding";
import { ResultPicker } from "../study/LevelPickers";

/**
 * Onboarding's results held (D259, D263): a staircase per skill, Coco on "Not yet" until a step is picked. The stairs
 * are this step's picture, so no scene heads it (D269).
 */
export function NowStep({
  headingRef,
  choices,
  onChoose,
  bands,
  exemptBand,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  choices: OnboardingChoices;
  onChoose: (over: Partial<OnboardingChoices>) => void;
  bands: readonly Band[];
  exemptBand: Band;
}) {
  const t = useTranslations("start");
  return (
    <fieldset className="app-fieldset">
      <legend className="app-onboarding__head">
        <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
          {t("nowHeading")}
        </h2>
      </legend>
      <p>{t("nowIntro")}</p>
      <div className="app-levels">
        {SKILLS.map((skill) => (
          <ResultPicker
            key={skill}
            skill={skill}
            value={choices.current[skill]}
            target={choices.targets[skill]}
            bands={bands}
            exemptBand={exemptBand}
            onChange={(band) => onChoose({ current: { ...choices.current, [skill]: band } })}
          />
        ))}
      </div>
    </fieldset>
  );
}
