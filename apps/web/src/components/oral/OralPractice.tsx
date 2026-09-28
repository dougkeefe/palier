"use client";

import type { OralHistoryEntry, OralSession, OralSessionChoice } from "@palier/app";
import { hasAnswers } from "@palier/app";
import type { Lang, TargetBand } from "@palier/domain";
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
  turnFocus,
} from "../../features/oral/practice-view";
import { historyTag } from "../../features/oral/report-view";
import { elapsedText, preflightNotice } from "../../features/writing/workshop-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { browserLevelKit, measureLevel } from "../../lib/oral/level";
import { browserMediaKit } from "../../lib/oral/recorder";
import { readStudyProfile } from "../../lib/study";
import { deviceTimeZone } from "../../lib/time-zone";
import { useContainer } from "../ContainerProvider";
import { NoKeyCard } from "../key/NoKeyCard";

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
  /** What a minute of practice is estimated to cost, or none when it is unpriced (D117). */
  readonly perMinuteUsd: number | null;
  /** This device's past sessions, newest first, each linking to its report (D126). */
  readonly history: readonly OralHistoryEntry[];
};

const loadSetup = async (container: Container): Promise<Setup> => {
  const [status, profile] = await Promise.all([container.useCases.apiKeyStatus(), readStudyProfile(container.settings)]);
  const choices = await container.useCases.oralSessionChoices({
    targetBand: profile?.targetBand ?? DEFAULT_TARGET,
    lang: TARGET_LANG,
  });
  const perMinuteUsd = container.useCases.featureCosts().find((cost) => cost.feature === "oral-practice")?.estimateUsd ?? null;
  const history = await container.useCases.oralHistory().catch(() => []);
  return { keyHeld: status !== null, choices, perMinuteUsd, history };
};

/**
 * Spoken practice (product-requirements.md §8.6 practice mode, §14; progress.md D117–D121). Pick a
 * session, check the microphone or choose to type, confirm the estimate, then answer the examiner's
 * questions one at a time. Each question is shown and played; each recorded answer is sent to OpenAI to
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
    const { useCases, ids } = container.container;
    return practiceController({
      useCases,
      newSessionId: () => sessionId(ids.ulid()),
      openMic: () => navigator.mediaDevices.getUserMedia({ audio: true }),
      measureLevel: (stream, onLevel) => measureLevel(stream, LEVEL_CHECK_MS, onLevel, browserLevelKit()),
      media: browserMediaKit(),
      now: monotonicNow,
      dispatch,
      onLevel: setLevel,
      onNoKey: () => setSetup((current) => (current === null ? current : { ...current, keyHeld: false })),
    });
  }, [container]);

  // Leaving the page ends a session in progress and lets the microphone go; coming back attaches again.
  useEffect(() => {
    control?.attach();
    return () => control?.dispose();
  }, [control]);

  useEffect(() => {
    if (container.status !== "ready") return;
    let alive = true;
    void loadSetup(container.container).then((loaded) => alive && setSetup(loaded));
    return () => {
      alive = false;
    };
  }, [container]);

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
  if (container.status !== "ready" || setup === null || control === null) {
    return <p role="status">{tCommon("loading")}</p>;
  }

  const heading = (key: string) => (
    <h2 ref={stepRef} tabIndex={-1} className="app-step-heading">
      {t(key)}
    </h2>
  );

  if (state.phase === "picking") {
    return (
      <div className="app-stack">
        <p>{t("intro")}</p>
        <Callout tone="info">
          <strong>{t("practiceModeTitle")}</strong> {t("practiceMode")}
        </Callout>
        {setup.keyHeld ? null : <NoKeyCard namespace="oral" estimateUsd={setup.perMinuteUsd} />}
        <section className="app-stack" aria-labelledby="oral-choose-title">
          <h2 id="oral-choose-title" ref={stepRef} tabIndex={-1} className="app-step-heading">
            {t("chooseTitle")}
          </h2>
          {setup.choices.length === 0 ? <p>{t("noneAvailable")}</p> : null}
          <ul className="app-list app-prompts">
            {setup.choices.map((choice) => {
              const estimate = sessionEstimate(setup.perMinuteUsd, choice.minutes);
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
                          onClick={() => dispatch({ type: "choose", choice })}
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
    const typeInstead = (
      <Button variant="ghost" onClick={() => void control.continueWith(choice, "typed")}>
        {t("typeInstead")}
      </Button>
    );
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
                <Button onClick={() => void control.continueWith(choice, "spoken")}>{t("micContinue")}</Button>
                {typeInstead}
              </div>
            </>
          ) : null}
          {mic === "quiet" ? (
            <>
              <Callout tone="info">{t("micQuiet")}</Callout>
              <div className="app-actions">
                <Button onClick={() => void control.checkMic()}>{t("micAgain")}</Button>
                <Button variant="secondary" onClick={() => void control.continueWith(choice, "spoken")}>
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
          <div className="app-actions">{back}</div>
        </div>
      </Card>
    );
  }

  if (state.phase === "confirming") {
    const { choice, mode, preflight } = state;
    const notice = preflightNotice(preflight);
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
          <p className="app-muted">{t(mode === "spoken" ? "sendsToSpoken" : "sendsToTyped")}</p>
          <div className="app-actions">
            <Button onClick={() => void control.start(choice, mode)}>{t("start")}</Button>
            {back}
          </div>
        </div>
      </Card>
    );
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
            <Question text={question.text} audio={question.audio} lang={choice.scenario.lang} textRef={questionRef} />
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
          {recordingKept === true ? <p className="app-muted">{t("recordingKept")}</p> : null}
          {recordingKept === false ? <Callout tone="info">{t("recordingNotSaved")}</Callout> : null}
          {session !== null && session.endReason !== null && hasAnswers(session) ? (
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
function Question({ text, audio, lang, textRef }: { text: string; audio: Blob | null; lang: Lang; textRef: Ref<HTMLParagraphElement> }) {
  const t = useTranslations("oral");
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const url = useMemo(() => (audio === null ? null : URL.createObjectURL(audio)), [audio]);

  useEffect(() => {
    if (url === null) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    if (url === null) return;
    // Playing may be refused (autoplay rules, or audio the browser cannot decode); the words are on screen.
    void player.current?.play().catch(() => undefined);
  }, [url]);

  return (
    <div className="app-stack">
      <p ref={textRef} tabIndex={-1} className="app-oral-question app-step-heading" lang={lang} aria-live="polite">
        {text}
      </p>
      {url === null ? null : (
        <>
          <audio
            ref={player}
            src={url}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
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
                void audioElement.play().catch(() => undefined);
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
