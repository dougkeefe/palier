"use client";

import { Button, Card, Timer, VoiceForm } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { type Ref, useSyncExternalStore } from "react";

import type { StudioController } from "../../features/oral/studio-controller";
import { type StudioState, meterWords, studioProgress, studioStatus } from "../../features/oral/studio-view";
import { elapsedText } from "../../features/writing/workshop-view";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/** Whether the user asked for less motion: the voice form is then drawn at rest (§10.5, D184). */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/**
 * Studio mode's conversation (product-requirements.md §8.6, progress.md D185): stripped to the voice form, the
 * phase indicator, the elapsed timer, the running meter, "could you repeat" and a large end control. No
 * transcript, because the real test gives none. The voice form is decorative, so a status line says in words
 * whether the call is dialling, open or ending. What decides is `features/oral/studio-controller.ts` and
 * `studio-view.ts`; this renders their state.
 */
export function OralStudio({
  state,
  control,
  elapsedMs,
  headingRef,
}: {
  state: Extract<StudioState, { phase: "live" }>;
  control: StudioController;
  elapsedMs: number;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const t = useTranslations("oral");
  const locale = useLocale();
  const still = usePrefersReducedMotion();
  const meter = meterWords(state.spent, locale);
  return (
    <div className="app-stack">
      <div className="app-oral-bar">
        <p className="app-tag">{t("phase", studioProgress(state))}</p>
        <Timer
          label={t("timerLabel")}
          text={elapsedText(elapsedMs)}
          tone="normal"
          announcement={t("timerAnnouncement", { minutes: Math.floor(Math.max(0, elapsedMs) / 60_000) })}
        />
      </div>
      <Card>
        <div className="app-stack app-studio">
          <h2 ref={headingRef} tabIndex={-1} className="app-step-heading">
            {t("studioTitle")}
          </h2>
          <VoiceForm levels={control.levels} still={still} />
          <p role="status">{t(studioStatus(state))}</p>
          <p className="app-muted">{t(meter.key, meter.values)}</p>
        </div>
      </Card>
      <div className="app-actions">
        <Button variant="secondary" onClick={() => void control.repeat()} disabled={!state.connected || state.repeating || state.ending}>
          {t("repeat")}
        </Button>
        <Button className="app-studio-end" onClick={() => void control.end()} disabled={state.ending}>
          {t("end")}
        </Button>
      </div>
    </div>
  );
}
