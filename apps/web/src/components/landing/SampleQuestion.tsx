"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SAMPLE_OPTIONS, type SampleOption, sampleFeedback, sampleOptionState } from "../../features/landing/landing";

/**
 * The landing page's one live question, so a visitor can try the reading test's shape before
 * opening the app. Picking shows the verdict in words, and marks the right answer and a wrong
 * pick with a sign as well as a colour (PRD §11: no state by colour alone).
 */
export function SampleQuestion() {
  const t = useTranslations("landing.sample");
  const [picked, setPicked] = useState<SampleOption | null>(null);

  return (
    <div id="try" className="landing-sample">
      <p className="landing-sample__tag">{t("tag")}</p>
      <p className="landing-sample__passage">{t("passage")}</p>
      <h3 className="landing-sample__question">{t("question")}</h3>
      <div className="landing-sample__options">
        {SAMPLE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={picked === option}
            className={`landing-sample__option landing-sample__option--${sampleOptionState(option, picked)} pl-focusable`}
            onClick={() => setPicked(option)}
          >
            {t(`options.${option}`)}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="landing-sample__feedback">
        {t(sampleFeedback(picked))}
      </p>
    </div>
  );
}
