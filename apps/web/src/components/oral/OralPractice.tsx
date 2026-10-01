"use client";

import type { OralHistoryEntry, OralSession, OralSessionChoice } from "@palier/app";
import type { Lang, OralMode, TargetBand } from "@palier/domain";
import { sessionId } from "@palier/domain";
import { Button, Callout, Card, Timer, Toast } from "@palier/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type Ref, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";

import { estimateText } from "../../features/key/spend-view";
import { LEVEL_CHECK_MS, browserFamily, recoverySteps } from "../../features/oral/mic";
import { type PracticeController, practiceController } from "../../features/oral/practice-controller";
import {
  INITIAL_PRACTICE,
  endMessage,
  failureMessage,
  phaseProgress,
  practice,
  sessionEstimate,
  studioWarmup,
  turnFocus,
} from "../../features/oral/practice-view";
import { endReportLink, historyTag } from "../../features/oral/report-view";
import { type StudioController, studioController } from "../../features/oral/studio-controller";
import { INITIAL_STUDIO, studio } from "../../features/oral/studio-view";
import { elapsedText, preflightNotice } from "../../features/writing/workshop-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { browserLevelKit, measureLevel } from "../../lib/oral/level";
import { browserMediaKit } from "../../lib/oral/recorder";
import { readStudyProfile } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";
import { OralStudio } from "./OralStudio";

/** The practice language is French until the English mirror (Phase 8), as for generated sets. */
const TARGET_LANG: Lang = "fr";

/** Without a study profile, sessions are at C, the level the SLE oral is for (D108's rule). */
const DEFAULT_TARGET: TargetBand = "C";

/** How often the screen's timer ticks the session, so a phase boundary is never late by more. */
const TICK_MS = 1_000;

/** The screen's monotonic clock, for the elapsed time it shows; read only in handlers and effects. */
const monotonicNow = (): number => performance.now();

/** The meter's full scale: speech at a normal distance reads about a third of full scale. */
const METER_MAX = 0.3;

type Setup = {
  readonly keyHeld: boolean;
  readonly choices: readonly OralSessionChoice[];
  /** What a minute of each mode is estimated to cost, or none when it is unpriced (D117, D167). */
  readonly perMinuteUsd: Readonly<Record<OralMode, number | null>>;
  /** This device's past sessions, newest first, each linking to its report (D126). */
  readonly history: readonly OralHistoryEntry[];
};

const loadSetup = async (container: Container): Promise<Setup> => {
  const [status, profile] = await Promise.all([container.useCases.apiKeyStatus(), readStudyProfile(container.settings)]);
  const choices = await container.useCases.oralSessionChoices({
    targetBand: profile?.targetBand ?? DEFAULT_TARGET,
    lang: TARGET_LANG,
  });
  const costs = container.useCases.featureCosts();
  const perMinute = (feature: "oral-practice" | "oral-studio") => costs.find((cost) => cost.feature === feature)?.estimateUsd ?? null;
  const perMinuteUsd = { practice: perMinute("oral-practice"), studio: perMinute("oral-studio") };
  // A session a tab was closed on is over: close it first, so it is listed and can be reported on (D144).
  await container.useCases.closeAbandonedSessions().catch(() => []);
  const history = await container.useCases.oralHistory().catch(() => []);
  return { keyHeld: status !== null, choices, perMinuteUsd, history };
};

/** An audio element that plays the studio examiner's voice as it arrives, outside the page's layout. */
const examinerAudio = (): HTMLAudioElement => {
  const audio = new Audio();
  audio.autoplay = true;
  return audio;
};

/**
 * Spoken practice (product-requirements.md §8.6, §14; progress.md D117–D121, D185). Pick a mode and a
 * session, check the microphone or choose to type, confirm the estimate, then answer the examiner's
 * questions one at a time, or, in studio mode, talk with the examiner live (`OralStudio`). Each question is shown and played; each recorded answer is sent to OpenAI to
 * be written down, and nowhere else [R12]. There is no running transcript: only the question being asked
 * is shown, as the real test gives none (§8.6). At the end the recording of the candidate's answers is
 * kept on this device under architecture.md §9.1's policy, and the transcript is shown.
 *
 * What decides is `features/oral/practice-controller.ts` and `practice-view.ts`, tested; this renders
 * their state and hands the controller the browser's microphone, recorder and clock.
 */
export function OralPractice() {
  const t = useTranslations("oral");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const container = useContainer();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [state, dispatch] = useReducer(practice, INITIAL_PRACTICE);
  const [studioState, studioDispatch] = useReducer(studio, INITIAL_STUDIO);
  const [held, setHeld] = useState<OralMode>("practice");
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [typed, setTyped] = useState("");
  const stepRef = useRef<HTMLHeadingElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const shownPhase = useRef(state.phase);
  const lastTurn = useRef<{ readonly waiting: boolean } | null>(null);
  const typedId = useId();

  // The session's controller, one per container: it holds the microphone, the recorders and the run.
  const control = useMemo((): PracticeController | null => {
    if (container.status !== "ready") return null;
    const { useCases, ids, oralLiveness } = container.container;
    return practiceController({
      useCases,
      newSessionId: () => sessionId(ids.ulid()),
      holdSession: (id) => oralLiveness.hold(id),
      openMic: () => navigator.mediaDevices.getUserMedia({ audio: true }),
      measureLevel: (stream, onLevel) => measureLevel(stream, LEVEL_CHECK_MS, onLevel, browserLevelKit()),
      media: browserMediaKit(),
      now: monotonicNow,
      dispatch,
      onLevel: setLevel,
      onNoKey: () => setSetup((current) => (current === null ? current : { ...current, keyHeld: false })),
    });
  }, [container]);

  // Studio mode's conversation, its own controller over the same container (D185): it takes the checked
  // microphone from the practice controller and hands the ended session back to the practice screen's end card.
  const studioControl = useMemo((): StudioController | null => {
    if (container.status !== "ready") return null;
    const { useCases, ids, oralLiveness, realtimePeer } = container.container;
    const levelKit = browserLevelKit();
    return studioController({
      useCases,
      newSessionId: () => sessionId(ids.ulid()),
      holdSession: (id) => oralLiveness.hold(id),
      peer: realtimePeer,
      makeAudio: examinerAudio,
      openLevel: (stream) => levelKit.open(stream),
      media: browserMediaKit(),
      now: monotonicNow,
      dispatch: studioDispatch,
      onEnded: dispatch,
      onNoKey: () => setSetup((current) => (current === null ? current : { ...current, keyHeld: false })),
    });
  }, [container]);

  // Leaving the page ends a session in progress and lets the microphone go; coming back attaches again.
  useEffect(() => {
    control?.attach();
    return () => control?.dispose();
  }, [control]);
  useEffect(() => {
    studioControl?.attach();
    return () => studioControl?.dispose();
  }, [studioControl]);

  // The picker reads its sessions again each time it is shown, so "Practise again" lists the one just
  // finished, and its report once it has one (D127).
  const picking = state.phase === "picking";
  useEffect(() => {
    if (container.status !== "ready" || !picking) return;
    let alive = true;
    void loadSetup(container.container).then((loaded) => alive && setSetup(loaded));
    return () => {
      alive = false;
    };
  }, [container, picking]);

  // Studio mode's route is woken on the steps before the tap, with no key, so the mint after it meets a warm
  // function (D190).
  const warmup = studioWarmup(state);
  useEffect(() => {
    if (container.status !== "ready" || warmup === null) return;
    void container.container.warmRealtime();
  }, [container, warmup]);

  // The screen's timer: the elapsed time shown, and a tick so the session moves on at a phase boundary.
  const running = state.phase === "running";
  const startedAtMs = state.phase === "running" ? state.startedAtMs : 0;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setElapsedMs(monotonicNow() - startedAtMs);
      void control?.tick();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running, startedAtMs, control]);

  // The same for a studio conversation: the time shown, and a tick that moves the phase and reads the cost.
  const studioLive = studioState.phase === "live";
  const studioStartedAtMs = studioState.phase === "live" ? studioState.startedAtMs : 0;
  useEffect(() => {
    if (!studioLive) return;
    const timer = setInterval(() => {
      setElapsedMs(monotonicNow() - studioStartedAtMs);
      void studioControl?.tick();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [studioLive, studioStartedAtMs, studioControl]);

  // Focus follows each step, to its heading, but not on the first render.
  useEffect(() => {
    if (shownPhase.current === state.phase) return;
    shownPhase.current = state.phase;
    stepRef.current?.focus();
  }, [state.phase]);

  // And each turn: to the question when it waits for a spoken answer, to the field for a typed one (D121).
  const waitingNow = state.phase === "running" ? state.waiting : false;
  const modeNow = state.phase === "running" ? state.mode : "typed";
  useEffect(() => {
    if (state.phase !== "running") {
      lastTurn.current = null;
      return;
    }
    const target = turnFocus(lastTurn.current, { waiting: waitingNow, mode: modeNow });
    lastTurn.current = { waiting: waitingNow };
    if (target === "question") questionRef.current?.focus();
    if (target === "answer") answerRef.current?.focus();
  }, [state.phase, waitingNow, modeNow]);

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || setup === null || control === null || studioControl === null) {
    return <p role="status">{tCommon("loading")}</p>;
  }

  const heading = (key: string) => (
    <h2 ref={stepRef} tabIndex={-1} className="app-step-heading">
      {t(key)}
    </h2>
  );

  if (state.phase === "picking") {
    const perMinuteUsd = setup.perMinuteUsd[held];
    return (
      <div className="app-stack">
        <p>{t("intro")}</p>
        <fieldset className="app-fieldset">
          <legend>{t("modeTitle")}</legend>
          {(["practice", "studio"] as const).map((mode) => {
            const minute = setup.perMinuteUsd[mode];
            const hint = mode === "practice" ? "modePracticeHint" : "modeStudioHint";
            return (
              <label key={mode} className="app-choice">
                <input type="radio" name="oral-mode" value={mode} checked={held === mode} onChange={() => setHeld(mode)} />
                <span className="app-choice__label">{t(mode === "practice" ? "modePractice" : "modeStudio")}</span>
                <span className="app-choice__hint">
                  {minute === null ? t(`${hint}Unpriced`) : t(hint, { amount: estimateText(minute, locale) })}
                </span>
              </label>
            );
          })}
        </fieldset>
        <Callout tone="info">
          {held === "practice" ? (
            <>
              <strong>{t("practiceModeTitle")}</strong> {t("practiceMode")}
            </>
          ) : (
            <>
              <strong>{t("studioModeTitle")}</strong> {t("studioMode")}
            </>
          )}
        </Callout>
        {setup.keyHeld ? null : <NoKeyCard namespace="oral" estimateUsd={perMinuteUsd} />}
        <section className="app-stack" aria-labelledby="oral-choose-title">
          <h2 id="oral-choose-title" ref={stepRef} tabIndex={-1} className="app-step-heading">
            {t("chooseTitle")}
          </h2>
          {setup.choices.length === 0 ? <p>{t("noneAvailable")}</p> : null}
          <ul className="app-list app-prompts">
            {setup.choices.map((choice) => {
              const estimate = sessionEstimate(perMinuteUsd, choice.minutes);
              return (
                <li key={choice.sessionType}>
                  <Card>
                    <h3 id={`oral-${choice.sessionType}`}>{t(`type_${choice.sessionType}`)}</h3>
                    <p>{t(`purpose_${choice.sessionType}`)}</p>
                    <p className="app-muted">
                      {estimate === null
                        ? t("sessionMetaUnpriced", { minutes: choice.minutes })
                        : t("sessionMeta", { minutes: choice.minutes, amount: estimateText(estimate, locale) })}
                    </p>
                    {setup.keyHeld ? (
                      <div className="app-actions">
                        <Button
                          variant="secondary"
                          aria-describedby={`oral-${choice.sessionType}`}
                          onClick={() => dispatch({ type: "choose", choice, held })}
                        >
                          {t("choose")}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
        <History history={setup.history} />
      </div>
    );
  }

  const back = (
    <Button variant="ghost" onClick={() => control.back()}>
      {t("back")}
    </Button>
  );

  if (state.phase === "mic") {
    const { choice, mic } = state;
    const studioHeld = state.held === "studio";
    const heldMode: OralMode = studioHeld ? "studio" : "practice";
    const typeInstead = (
      <Button variant="ghost" onClick={() => void control.continueWith(choice, "typed")}>
        {t(studioHeld ? "studioTypeInstead" : "typeInstead")}
      </Button>
    );
    // Studio mode is a spoken conversation: without the microphone it can only be practice by typing (D185).
    const needsMic =
      studioHeld && (mic === "denied" || mic === "no-mic" || mic === "unsupported" || mic === "failed") ? (
        <Callout tone="info">{t("studioNeedsMic")}</Callout>
      ) : null;
    return (
      <Card>
        {heading("micTitle")}
        <div className="app-stack">
          <p>{t("micIntro")}</p>
          {mic === "idle" ? (
            <div className="app-actions">
              <Button onClick={() => void control.checkMic()}>{t("micCheck")}</Button>
              {typeInstead}
            </div>
          ) : null}
          {mic === "listening" ? (
            <div className="app-stack">
              <Toast tone="info">{t("micListening")}</Toast>
              <label className="app-field">
                <span>{t("micLevel")}</span>
                <meter className="app-meter" min={0} max={METER_MAX} value={Math.min(level, METER_MAX)} />
              </label>
              <div className="app-actions">{typeInstead}</div>
            </div>
          ) : null}
          {mic === "ok" ? (
            <>
              <Callout tone="correct">{t("micOk")}</Callout>
              <div className="app-actions">
                <Button onClick={() => void control.continueWith(choice, "spoken", heldMode)}>{t("micContinue")}</Button>
                {typeInstead}
              </div>
            </>
          ) : null}
          {mic === "quiet" ? (
            <>
              <Callout tone="info">{t("micQuiet")}</Callout>
              <div className="app-actions">
                <Button onClick={() => void control.checkMic()}>{t("micAgain")}</Button>
                <Button variant="secondary" onClick={() => void control.continueWith(choice, "spoken", heldMode)}>
                  {t("micContinueAnyway")}
                </Button>
                {typeInstead}
              </div>
            </>
          ) : null}
          {mic === "denied" ? (
            <>
              <Callout tone="incorrect">
                <strong>{t("micDeniedTitle")}</strong> {t("micDenied")}
              </Callout>
              <ol className="app-steps">
                {recoverySteps(browserFamily(navigator.userAgent)).map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
              <div className="app-actions">
                <Button onClick={() => void control.checkMic()}>{t("micAgain")}</Button>
                {typeInstead}
              </div>
            </>
          ) : null}
          {mic === "no-mic" || mic === "unsupported" || mic === "failed" ? (
            <>
              <Callout tone="incorrect">
                {t(mic === "no-mic" ? "micNoMic" : mic === "unsupported" ? "micUnsupported" : "micFailed")}
              </Callout>
              <div className="app-actions">
                {mic === "unsupported" ? null : <Button onClick={() => void control.checkMic()}>{t("micAgain")}</Button>}
                {typeInstead}
              </div>
            </>
          ) : null}
          {needsMic}
          <div className="app-actions">{back}</div>
        </div>
      </Card>
    );
  }

  if (state.phase === "confirming") {
    const { choice, mode, preflight } = state;
    const studioHeld = state.held === "studio";
    const notice = preflightNotice(preflight);
    const start = () => {
      if (!studioHeld) {
        void control.start(choice, mode);
        return;
      }
      // The tap that starts the conversation: the microphone the check opened goes to the studio controller.
      const microphone = control.handOver();
      setElapsedMs(0);
      dispatch({ type: "studio" });
      void studioControl.start(choice, microphone);
    };
    return (
      <Card>
        {heading("preflightTitle")}
        <div className="app-stack">
          <p>
            {t("sessionSummary", { type: t(`type_${choice.sessionType}`), minutes: choice.minutes })}
          </p>
          <p>
            {preflight.estimateUsd === null
              ? t("preflightUnpriced")
              : t("preflightEstimate", { amount: estimateText(preflight.estimateUsd, locale) })}
          </p>
          {notice === null ? null : <Callout tone={notice.tone}>{t(notice.key)}</Callout>}
          <p className="app-muted">{t(studioHeld ? "sendsToStudio" : mode === "spoken" ? "sendsToSpoken" : "sendsToTyped")}</p>
          <div className="app-actions">
            <Button onClick={start}>{t("start")}</Button>
            {back}
          </div>
        </div>
      </Card>
    );
  }

  if (state.phase === "studio") {
    if (studioState.phase !== "live") return <p role="status">{tCommon("loading")}</p>;
    return <OralStudio state={studioState} control={studioControl} elapsedMs={elapsedMs} headingRef={stepRef} />;
  }

  if (state.phase === "running") {
    const { choice, mode, question, waiting, turn, ending } = state;
    const progress = phaseProgress(question, choice);
    const recordingNow = turn === "recording";
    // After an answer is sent, focus rests on the question, whose live region reads the next one (D121).
    const toQuestion = () => questionRef.current?.focus();
    return (
      <div className="app-stack">
        <div className="app-oral-bar">
          <p className="app-tag">{t("phase", progress)}</p>
          <Timer
            label={t("timerLabel")}
            text={elapsedText(elapsedMs)}
            tone="normal"
            announcement={t("timerAnnouncement", { minutes: Math.floor(Math.max(0, elapsedMs) / 60_000) })}
          />
        </div>
        <Card>
          {heading("examinerAsks")}
          {question === null ? (
            <Toast tone="info">{t("preparing")}</Toast>
          ) : (
            <Question
              text={question.text}
              audio={question.audio}
              lang={choice.scenario.lang}
              textRef={questionRef}
              onPlaying={control.questionPlaying}
              onHeard={control.questionHeard}
            />
          )}
        </Card>
        {waiting && !ending ? (
          mode === "spoken" ? (
            <div className="app-stack">
              <div className="app-actions">
                <Button
                  onClick={() => {
                    if (recordingNow) {
                      void control.stopAndSend().then(toQuestion);
                    } else {
                      control.record();
                    }
                  }}
                >
                  {t(recordingNow ? "stopAndSend" : "record")}
                </Button>
              </div>
              {recordingNow ? <Toast tone="info">{t("recording")}</Toast> : null}
            </div>
          ) : (
            <div className="app-stack">
              <label className="app-field" htmlFor={typedId}>
                <span>{t("typedLabel")}</span>
                <textarea
                  id={typedId}
                  ref={answerRef}
                  className="app-textarea"
                  lang={choice.scenario.lang}
                  rows={4}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                />
              </label>
              <div className="app-actions">
                <Button
                  onClick={() => {
                    if (control.sendTyped(typed)) {
                      setTyped("");
                      toQuestion();
                    }
                  }}
                  disabled={typed.trim() === ""}
                >
                  {t("sendAnswer")}
                </Button>
              </div>
            </div>
          )
        ) : null}
        {!waiting && turn === "sending" && !ending ? <Toast tone="info">{t("listening")}</Toast> : null}
        {ending ? <Toast tone="info">{t("ending")}</Toast> : null}
        <div className="app-actions">
          <Button variant="secondary" onClick={() => void control.end()} disabled={ending}>
            {t("end")}
          </Button>
        </div>
      </div>
    );
  }

  const { session, evicted, failure, choice, recordingKept } = state;
  return (
    <div className="app-stack">
      <Card>
        {heading("endedTitle")}
        <div className="app-stack">
          <p>{t(endMessage(session?.endReason ?? null))}</p>
          {failure === null ? null : (
            <Callout tone="incorrect">
              {t(failureMessage(failure))} {t("transcriptKept")}
            </Callout>
          )}
          {evicted > 0 ? <Callout tone="info">{t("evicted", { count: evicted })}</Callout> : null}
          {recordingKept === true ? (
            <p className="app-muted">{t(session?.mode === "studio" ? "recordingKeptStudio" : "recordingKept")}</p>
          ) : null}
          {recordingKept === false ? <Callout tone="info">{t("recordingNotSaved")}</Callout> : null}
          {endReportLink(session) && session !== null ? (
            <div className="app-actions">
              <Link
                href={{ pathname: "/practice/oral/report", query: { session: session.id } }}
                className="pl-btn pl-btn--primary pl-focusable"
              >
                {t("reportLink")}
              </Link>
            </div>
          ) : (
            <p className="app-muted">{t("reportNothing")}</p>
          )}
        </div>
      </Card>
      <Transcript session={session} lang={choice.scenario.lang} />
      <div className="app-actions">
        <Button onClick={() => control.back()}>{t("again")}</Button>
        <Link href="/settings/data" className="app-link pl-focusable">
          {t("dataLink")}
        </Link>
      </div>
    </div>
  );
}

/**
 * The question in words and in the examiner's voice, played as it arrives (D119). While it plays it can
 * be paused, and once it has stopped it can be heard again from the start (WCAG 1.4.2, D121). The words
 * are a polite live region, so a new question is read out wherever focus is.
 */
function Question({
  text,
  audio,
  lang,
  textRef,
  onPlaying,
  onHeard,
}: {
  text: string;
  audio: Blob | null;
  lang: Lang;
  textRef: Ref<HTMLParagraphElement>;
  /** The voice began, or began again: the candidate is listening (D127). */
  onPlaying: () => void;
  /** The voice stopped, or could not play: the question has been heard (D127). */
  onHeard: () => void;
}) {
  const t = useTranslations("oral");
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // The address is made, given to the player and revoked by one effect, so a remount (Strict Mode)
  // never plays a revoked one (D127). Playing may be refused (autoplay rules, or audio the browser
  // cannot decode); the words are on screen, and the question counts as heard now.
  useEffect(() => {
    const element = player.current;
    if (audio === null || element === null) return;
    const made = URL.createObjectURL(audio);
    element.src = made;
    void element.play().catch(onHeard);
    return () => URL.revokeObjectURL(made);
  }, [audio, onHeard]);

  return (
    <div className="app-stack">
      <p ref={textRef} tabIndex={-1} className="app-oral-question app-step-heading" lang={lang} aria-live="polite">
        {text}
      </p>
      {audio === null ? null : (
        <>
          <audio
            ref={player}
            onPlay={() => {
              setPlaying(true);
              onPlaying();
            }}
            onPause={() => {
              setPlaying(false);
              onHeard();
            }}
            onEnded={() => {
              setPlaying(false);
              onHeard();
            }}
            onError={() => {
              setPlaying(false);
              onHeard();
            }}
          />
          <div className="app-actions">
            <Button
              variant="ghost"
              onClick={() => {
                const audioElement = player.current;
                if (audioElement === null) return;
                if (playing) {
                  audioElement.pause();
                  return;
                }
                audioElement.currentTime = 0;
                void audioElement.play().catch(onHeard);
              }}
            >
              {t(playing ? "pauseQuestion" : "playAgain")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** This device's past sessions (D126), each opening its report, where one can be asked for when it has none. */
function History({ history }: { history: readonly OralHistoryEntry[] }) {
  const t = useTranslations("oral");
  const format = useFormatter();
  if (history.length === 0) return null;
  return (
    <section className="app-stack" aria-labelledby="oral-history-title">
      <h2 id="oral-history-title">{t("historyTitle")}</h2>
      <p className="app-muted">{t("historyNote")}</p>
      <ul className="app-list">
        {history.map((entry) => (
          <li key={entry.id} className="app-history">
            <span id={`oral-history-${entry.id}`}>
              {t("historyItem", {
                type: entry.sessionType === null ? t("historyUnknownType") : t(`type_${entry.sessionType}`),
                date: format.dateTime(new Date(entry.startedAt), { dateStyle: "medium", timeStyle: "short", timeZone: deviceTimeZone() }),
              })}
            </span>
            <span className="app-tag">{t(historyTag(entry))}</span>
            <Link
              href={{ pathname: "/practice/oral/report", query: { session: entry.id } }}
              className="app-link pl-focusable"
              aria-describedby={`oral-history-${entry.id}`}
            >
              {t("historyOpen")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The stored transcript, shown once the session is over; its report is a link away (D126). */
function Transcript({ session, lang }: { session: OralSession | null; lang: Lang }) {
  const t = useTranslations("oral");
  const turns = session?.turns ?? [];
  return (
    <section className="app-stack" aria-labelledby="oral-transcript-title">
      <h2 id="oral-transcript-title">{t("transcriptTitle")}</h2>
      {turns.length === 0 ? (
        <p>{t("transcriptEmpty")}</p>
      ) : (
        <ol className="app-list app-oral-transcript">
          {turns.map((turn, index) => (
            <li key={`${String(index)}-${turn.speaker}`}>
              <strong>{t(turn.speaker === "examiner" ? "speakerExaminer" : "speakerYou")}</strong>{" "}
              <span lang={lang}>{turn.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
