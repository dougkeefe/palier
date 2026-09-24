"use client";

import { Button, Callout } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CHOICES,
  ONBOARDING_STEPS,
  type OnboardingChoices,
  type OnboardingStep,
  canSkipFrom,
  destinationFor,
  profileFrom,
  stepAfter,
  stepBefore,
} from "../../features/onboarding/onboarding";
import { useRouter } from "../../i18n/navigation";
import { DAILY_GOALS, writeStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";

/**
 * Onboarding (product-requirements.md §8.1), as one fieldset per step with native
 * radio inputs: real form controls, so keyboard and screen-reader behaviour come from
 * the platform. Each step's heading takes focus as it appears, so a screen-reader user
 * hears where they are (§11: focus is never lost as a flow advances).
 */
export function OnboardingWizard() {
  const t = useTranslations("start");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("direction");
  const [choices, setChoices] = useState<OnboardingChoices>(DEFAULT_CHOICES);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const choose = (over: Partial<OnboardingChoices>) => setChoices((c) => ({ ...c, ...over }));
  const index = ONBOARDING_STEPS.indexOf(step);

  const finish = async (final: OnboardingChoices) => {
    if (container.status !== "ready") return;
    setSaving(true);
    try {
      await writeStudyProfile(container.container.settings, profileFrom(final));
      router.push(destinationFor(final));
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  const onNext = () => {
    const next = stepAfter(step);
    if (next === null) void finish(choices);
    else setStep(next);
  };

  return (
    <form
      className="app-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <p className="app-muted">{t("stepOf", { current: index + 1, total: ONBOARDING_STEPS.length })}</p>

      {step === "direction" ? (
        <fieldset className="app-fieldset">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
              {t("directionHeading")}
            </h2>
          </legend>
          <label className="app-choice">
            <input type="radio" name="direction" value="fr" defaultChecked />
            <span className="app-choice__label">{t("directionFrench")}</span>
            <span className="app-choice__hint">{t("directionFrenchHint")}</span>
          </label>
          <label className="app-choice app-choice--disabled">
            <input type="radio" name="direction" value="en" disabled />
            <span className="app-choice__label">{t("directionEnglish")}</span>
            <span className="app-choice__hint">{t("directionEnglishHint")}</span>
          </label>
          <p className="app-muted">{t("localNote")}</p>
        </fieldset>
      ) : null}

      {step === "target" ? (
        <fieldset className="app-fieldset">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
              {t("targetHeading")}
            </h2>
          </legend>
          {(["B", "C"] as const).map((band) => (
            <label key={band} className="app-choice">
              <input
                type="radio"
                name="target"
                value={band}
                checked={choices.targetBand === band}
                onChange={() => choose({ targetBand: band })}
              />
              <span className="app-choice__label">{t(band === "B" ? "targetB" : "targetC")}</span>
              <span className="app-choice__hint">{t(band === "B" ? "targetBHint" : "targetCHint")}</span>
            </label>
          ))}
          <label className="app-field">
            <span>{t("testDateLabel")}</span>
            <input
              type="date"
              className="app-input"
              value={choices.testDate ?? ""}
              onChange={(event) => choose({ testDate: event.target.value === "" ? null : event.target.value })}
            />
          </label>
        </fieldset>
      ) : null}

      {step === "placement" ? (
        <fieldset className="app-fieldset">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
              {t("placementHeading")}
            </h2>
          </legend>
          {(["diagnostic", "skip"] as const).map((placement) => (
            <label key={placement} className="app-choice">
              <input
                type="radio"
                name="placement"
                value={placement}
                checked={choices.placement === placement}
                onChange={() => choose({ placement })}
              />
              <span className="app-choice__label">
                {t(placement === "diagnostic" ? "placementDiagnostic" : "placementSkip")}
              </span>
              <span className="app-choice__hint">
                {t(placement === "diagnostic" ? "placementDiagnosticHint" : "placementSkipHint")}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {step === "goal" ? (
        <fieldset className="app-fieldset">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
              {t("goalHeading")}
            </h2>
          </legend>
          {DAILY_GOALS.map((minutes) => (
            <label key={minutes} className="app-choice">
              <input
                type="radio"
                name="goal"
                value={minutes}
                checked={choices.dailyGoalMinutes === minutes}
                onChange={() => choose({ dailyGoalMinutes: minutes })}
              />
              <span className="app-choice__label">{t("goalOption", { minutes })}</span>
            </label>
          ))}
          <p className="app-muted">{t("goalHint")}</p>
        </fieldset>
      ) : null}

      {failed ? <Callout tone="incorrect">{tCommon("loadFailed")}</Callout> : null}

      <div className="app-actions">
        {stepBefore(step) === null ? null : (
          <Button variant="secondary" onClick={() => setStep(stepBefore(step) ?? step)}>
            {t("back")}
          </Button>
        )}
        {canSkipFrom(step) && stepAfter(step) !== null ? (
          <Button variant="ghost" onClick={() => void finish({ ...choices, placement: "skip" })} disabled={saving}>
            {t("placementSkip")}
          </Button>
        ) : null}
        <Button type="submit" disabled={saving || container.status !== "ready"}>
          {stepAfter(step) === null ? t("finish") : t("next")}
        </Button>
      </div>
    </form>
  );
}
