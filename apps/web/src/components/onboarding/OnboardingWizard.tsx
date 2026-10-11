"use client";

import { Button, Callout } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CHOICES,
  type OnboardingChoices,
  type OnboardingStep,
  destinationFor,
  finishLabel,
  profileFrom,
  stepAfter,
  stepBefore,
  stepperSegments,
  stepsFor,
} from "../../features/onboarding/onboarding";
import { useRouter } from "../../i18n/navigation";
import { DAILY_GOALS, writeStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { NonAffiliation } from "../NonAffiliation";
import { KeyStep } from "./KeyStep";

/**
 * Onboarding (product-requirements.md §8.1), as one fieldset per step with native
 * radio inputs: real form controls, so keyboard and screen-reader behaviour come from
 * the platform. Each step's heading takes focus as it appears, so a screen-reader user
 * hears where they are (§11: focus is never lost as a flow advances).
 *
 * The order is the owner's (progress.md D224): direction, target, goal, the key, then the placement,
 * whose choice is where the wizard lands. The key step is shown unless this browser already holds a
 * key (D220): why Palier runs on the user's own key, what it costs, and how to get one, with the key
 * taken in place. It is `KeyStep`, outside the wizard's `<form>`, since the key's own form sits in
 * it. The non-affiliation statement heads the first step only; the footer carries it on every page.
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
  // Read once: a key saved in the key step itself keeps the step, so Back and forth never loses it.
  const [hasKey, setHasKey] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (container.status !== "ready") return;
    let live = true;
    void container.container.useCases.apiKeyStatus().then(
      (status) => live && setHasKey(status !== null),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [container]);

  const choose = (over: Partial<OnboardingChoices>) => setChoices((c) => ({ ...c, ...over }));
  const steps = stepsFor(hasKey);
  const index = steps.indexOf(step);

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

  const after = stepAfter(step, hasKey);
  const before = stepBefore(step, hasKey);
  const onNext = () => {
    if (after === null) void finish(choices);
    else setStep(after);
  };

  const stepper = (
    <div className="app-stepper">
      <p className="app-muted">{t("stepOf", { current: index + 1, total: steps.length })}</p>
      <span className="app-stepper__bar" aria-hidden="true">
        {stepperSegments(index, steps.length).map((done, i) => (
          <span key={i} className={done ? "app-stepper__segment app-stepper__segment--done" : "app-stepper__segment"} />
        ))}
      </span>
    </div>
  );
  const failure = failed ? <Callout tone="incorrect">{tCommon("loadFailed")}</Callout> : null;

  if (step === "key" && container.status === "ready") {
    return (
      <div className="app-stack">
        {stepper}
        <KeyStep
          useCases={container.container.useCases}
          headingRef={headingRef}
          onBack={() => setStep(before ?? step)}
          onNext={onNext}
        />
        {failure}
      </div>
    );
  }

  return (
    <form
      className="app-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      {step === "direction" ? <NonAffiliation /> : null}
      {stepper}

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

      {failure}

      <div className="app-actions">
        {before === null ? null : (
          <Button variant="secondary" onClick={() => setStep(before)}>
            {t("back")}
          </Button>
        )}
        <Button type="submit" arrow="next" disabled={saving || container.status !== "ready"}>
          {after === null ? t(finishLabel(choices.placement)) : t("next")}
        </Button>
      </div>
    </form>
  );
}
