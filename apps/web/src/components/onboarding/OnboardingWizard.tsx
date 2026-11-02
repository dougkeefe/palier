"use client";

import { Button, Callout, IconButton, Scene } from "@palier/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CHOICES,
  type OnboardingChoices,
  type OnboardingStep,
  choicesFrom,
  profileFrom,
  readySummary,
  sceneFor,
  skippable,
  stepAfter,
  stepBefore,
  stepsFor,
} from "../../features/onboarding/onboarding";
import { useRouter } from "../../i18n/navigation";
import { readStudyProfile, writeStudyProfile } from "../../lib/study";
import { useContainer } from "../ContainerProvider";
import { BringProgress, type Restored } from "./BringProgress";
import { GoalStep } from "./GoalStep";
import { KeyStep } from "./KeyStep";
import { NowStep } from "./NowStep";
import { ReadyStep } from "./ReadyStep";
import { StepProgress } from "./StepProgress";
import { TargetStep } from "./TargetStep";
import { WelcomeStep } from "./WelcomeStep";

/**
 * Onboarding (product-requirements.md §8.1), as the owner redrew it (progress.md D269): one card per step, each headed
 * by Coco in a scene, with Back at its top left, Skip at its top right from the results on, and the dots and the way
 * on at its foot. The steps: a welcome, with the quiet ways to bring progress from a file or another device under it
 * (D271), the target, the results held (D259), the daily goal, the key (D220), and a "you're set" card that saves and
 * lands on today's plan. No assessment comes first. From 960px the picture sits beside the card, so each card fits a
 * desktop screen without scrolling (D271).
 *
 * One fieldset per question with native radios, so keyboard and screen-reader behaviour are the platform's, and Enter
 * is Continue. Each step's heading takes focus as it appears, so a screen-reader user hears where they are (§11: focus
 * is never lost as a flow advances). The welcome and the key step are each outside the `<form>`, since the import's,
 * the pairing's and the key's own forms sit in them. The wizard starts from a saved profile when there is one (`choicesFrom`), so finishing again never overwrites it.
 */
export function OnboardingWizard() {
  const t = useTranslations("start");
  const tCommon = useTranslations("common");
  const container = useContainer();
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [choices, setChoices] = useState<OnboardingChoices>(DEFAULT_CHOICES);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // Once opened, the per-skill targets stay open: deriving it from the targets alone would close the
  // disclosure under the user as soon as their choices happened to agree again (D259).
  const [perSkillOpen, setPerSkillOpen] = useState(false);
  // Read once: a key saved in the key step itself keeps the step, so Back and forth never loses it.
  const [hasKey, setHasKey] = useState(false);
  // Read again on the ready card, which says whether a key is held, saved in the key step or before.
  const [keyHeld, setKeyHeld] = useState(false);
  // What an import or a pairing brought over (D270): a profile lets the user go straight to today.
  const [restored, setRestored] = useState<Restored>("none");
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
      (status) => {
        if (!live) return;
        setHasKey(status !== null);
        // So a key held from the start reads as held on the ready card, before its own re-read answers.
        setKeyHeld(status !== null);
      },
      () => undefined,
    );
    void readStudyProfile(container.container.settings).then(
      (profile) => live && profile !== null && setChoices(choicesFrom(profile)),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [container]);

  useEffect(() => {
    if (step !== "ready" || container.status !== "ready") return;
    let live = true;
    void container.container.useCases.apiKeyStatus().then(
      (status) => live && setKeyHeld(status !== null),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [step, container]);

  const choose = (over: Partial<OnboardingChoices>) => setChoices((c) => ({ ...c, ...over }));
  const steps = stepsFor(hasKey);
  const index = steps.indexOf(step);
  const ready = container.status === "ready";

  const finish = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await writeStudyProfile(container.container.settings, profileFrom(choices));
      router.push("/home");
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  const after = stepAfter(step, hasKey);
  const before = stepBefore(step, hasKey);
  const onNext = () => {
    if (after === null) void finish();
    else setStep(after);
  };

  // After an import or a pairing: a profile that came over is where the questions now start, and today is open.
  const onRestored = async () => {
    if (!ready) return;
    const profile = await readStudyProfile(container.container.settings);
    if (profile === null) {
      setRestored("data");
      return;
    }
    setChoices(choicesFrom(profile));
    setRestored("profile");
  };

  const scene = sceneFor(step);
  // With no picture, the card takes the whole width on a desktop screen (D271).
  const frame = scene === null ? "app-onboarding app-onboarding--no-scene" : "app-onboarding";
  const progress = <StepProgress index={index} total={steps.length} />;
  const failure = failed ? <Callout tone="incorrect">{tCommon("loadFailed")}</Callout> : null;

  const top = (
    <div className="app-onboarding__top">
      {before === null ? (
        <span />
      ) : (
        <IconButton glyph="chevron-left" label={t("back")} onClick={() => setStep(before)} />
      )}
      {skippable(step) ? (
        <button type="button" className="app-onboarding__skip pl-focusable" disabled={saving || !ready} onClick={() => void finish()}>
          {t("skip")}
        </button>
      ) : null}
    </div>
  );
  // Keyed by the step, so Coco hops in again on each card.
  const picture =
    scene === null ? null : (
      <Scene key={step} name={scene} className={step === "key" ? "app-onboarding__scene app-onboarding__scene--small" : "app-onboarding__scene"} />
    );

  if (step === "welcome") {
    return (
      <div className={frame} data-step={step}>
        {top}
        {picture}
        <WelcomeStep
          headingRef={headingRef}
          progress={progress}
          onNext={onNext}
          ready={ready}
          bring={
            <BringProgress
              restored={restored}
              onRestored={onRestored}
              onToday={() => router.push("/home")}
              onContinue={onNext}
            />
          }
        />
      </div>
    );
  }

  if (step === "key" && ready) {
    return (
      <div className={frame} data-step={step}>
        {top}
        {picture}
        <KeyStep useCases={container.container.useCases} headingRef={headingRef} progress={progress} onNext={onNext} />
        {failure}
      </div>
    );
  }

  return (
    <div className={frame} data-step={step}>
      {top}
      {picture}
      <form
        className="app-stack"
        onSubmit={(event) => {
          event.preventDefault();
          onNext();
        }}
      >
        {step === "target" ? (
          <TargetStep
            headingRef={headingRef}
            choices={choices}
            onChoose={choose}
            perSkillOpen={perSkillOpen}
            onPerSkillToggle={setPerSkillOpen}
          />
        ) : null}
        {step === "now" && ready ? (
          <NowStep
            headingRef={headingRef}
            choices={choices}
            onChoose={choose}
            bands={container.container.profile.bands}
            exemptBand={container.container.profile.exemptBand}
          />
        ) : null}
        {step === "goal" ? <GoalStep headingRef={headingRef} choices={choices} onChoose={choose} /> : null}
        {step === "ready" ? <ReadyStep headingRef={headingRef} summary={readySummary(choices, keyHeld)} /> : null}

        {failure}

        <div className="app-onboarding__bottom">
          {progress}
          <Button type="submit" arrow="next" disabled={saving || !ready}>
            {after === null ? t("finish") : t("next")}
          </Button>
        </div>
      </form>
    </div>
  );
}
