"use client";

import { SKILLS } from "@palier/domain";
import { Button, Callout } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CHOICES,
  type OnboardingChoices,
  type OnboardingStep,
  destinationFor,
  finishLabel,
  placementsFor,
  profileFrom,
  settle,
  stepAfter,
  stepBefore,
  stepperSegments,
  stepsFor,
} from "../../features/onboarding/onboarding";
import { useRouter } from "../../i18n/navigation";
import { DAILY_GOALS, oneTarget, targetsOf, writeStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { NonAffiliation } from "../NonAffiliation";
import { ResultPicker, TargetPicker } from "../study/LevelPickers";
import { KeyStep } from "./KeyStep";

/**
 * Onboarding (product-requirements.md §8.1), as one fieldset per step with native
 * radio inputs: real form controls, so keyboard and screen-reader behaviour come from
 * the platform. Each step's heading takes focus as it appears, so a screen-reader user
 * hears where they are (§11: focus is never lost as a flow advances).
 *
 * The order is the owner's (progress.md D224), with the results already held after the target
 * (D259): direction, target, results, goal, the key, then the placement, whose choice is where the
 * wizard lands. The target is one answer, B or C, with a target per skill folded under it for a
 * position whose profile differs; the results default to "not yet", so the step is skippable. The key step is shown unless this browser already holds a
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

  const exemptBand = container.status === "ready" ? container.container.profile.exemptBand : null;
  const bands = container.status === "ready" ? container.container.profile.bands : [];
  const placements = exemptBand === null ? (["diagnostic", "skip"] as const) : placementsFor(choices, exemptBand);
  const sharedTarget = oneTarget(choices.targets);
  // A diagnostic chosen, then made pointless by the results, reads as a skip on screen and on finishing.
  const placement = exemptBand === null ? choices.placement : settle(choices, exemptBand).placement;

  const finish = async (chosen: OnboardingChoices) => {
    if (container.status !== "ready") return;
    const final = settle(chosen, container.container.profile.exemptBand);
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
                checked={sharedTarget === band}
                onChange={() => choose({ targets: targetsOf(band) })}
              />
              <span className="app-choice__label">{t(band === "B" ? "targetB" : "targetC")}</span>
              <span className="app-choice__hint">{t(band === "B" ? "targetBHint" : "targetCHint")}</span>
            </label>
          ))}
          <details className="app-key-step__more" open={sharedTarget === null}>
            <summary>{t("targetPerSkill")}</summary>
            <div className="app-stack">
              <p className="app-muted">{t("targetPerSkillHint")}</p>
              {SKILLS.map((skill) => (
                <TargetPicker
                  key={skill}
                  skill={skill}
                  value={choices.targets[skill]}
                  onChange={(band) => choose({ targets: { ...choices.targets, [skill]: band } })}
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
              onChange={(event) => choose({ testDate: event.target.value === "" ? null : event.target.value })}
            />
          </label>
        </fieldset>
      ) : null}

      {step === "now" && exemptBand !== null ? (
        <fieldset className="app-fieldset">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
              {t("nowHeading")}
            </h2>
          </legend>
          <p className="app-muted">{t("nowIntro")}</p>
          <div className="app-levels">
            {SKILLS.map((skill) => (
              <ResultPicker
                key={skill}
                skill={skill}
                value={choices.current[skill]}
                target={choices.targets[skill]}
                bands={bands}
                exemptBand={exemptBand}
                onChange={(band) => choose({ current: { ...choices.current, [skill]: band } })}
              />
            ))}
          </div>
          <p className="app-muted">{t("nowHint")}</p>
        </fieldset>
      ) : null}

      {step === "placement" ? (
        <fieldset className="app-fieldset">
          <legend>
            <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
              {t("placementHeading")}
            </h2>
          </legend>
          {placements.length === 1 ? <p>{t("placementNothing")}</p> : null}
          {placements.map((offered) => (
            <label key={offered} className="app-choice">
              <input
                type="radio"
                name="placement"
                value={offered}
                checked={placement === offered}
                onChange={() => choose({ placement: offered })}
              />
              <span className="app-choice__label">
                {t(offered === "diagnostic" ? "placementDiagnostic" : "placementSkip")}
              </span>
              <span className="app-choice__hint">
                {t(offered === "diagnostic" ? "placementDiagnosticHint" : "placementSkipHint")}
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
          {after === null ? t(finishLabel(placement)) : t("next")}
        </Button>
      </div>
    </form>
  );
}
