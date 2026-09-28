"use client";

import type { OralPracticeRun, OralSession, OralSessionChoice } from "@palier/app";
import type { Lang, SessionId, TargetBand } from "@palier/domain";
import { sessionId } from "@palier/domain";
import { Button, Callout, Card, Timer, Toast } from "@palier/ui";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";

import { estimateText } from "../../features/key/spend-view";
import { type AnswerBridge, answerBridge } from "../../features/oral/answer-bridge";
import { LEVEL_CHECK_MS, browserFamily, levelVerdict, micFailure, recoverySteps } from "../../features/oral/mic";
import {
  type AnswerMode,
  INITIAL_PRACTICE,
  endMessage,
  failureMessage,
  oralFailure,
  phaseProgress,
  practice,
  sessionEstimate,
} from "../../features/oral/practice-view";
import { elapsedText, preflightNotice } from "../../features/writing/workshop-view";
import { Link } from "../../i18n/navigation";
import type { Container } from "../../lib/container";
import { browserLevelKit, measureLevel } from "../../lib/oral/level";
import { type ClipRecording, type SessionRecording, browserMediaKit, recordClip, recordSession } from "../../lib/oral/recorder";
import { readStudyProfile } from "../../lib/study";
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

type Setup = {
  readonly keyHeld: boolean;
  readonly choices: readonly OralSessionChoice[];
  /** What a minute of practice is estimated to cost, or none when it is unpriced (D117). */
  readonly perMinuteUsd: number | null;
};

const loadSetup = async (container: Container): Promise<Setup> => {
  const [status, profile] = await Promise.all([container.useCases.apiKeyStatus(), readStudyProfile(container.settings)]);
  const choices = await container.useCases.oralSessionChoices({
    targetBand: profile?.targetBand ?? DEFAULT_TARGET,
    lang: TARGET_LANG,
  });
  const perMinuteUsd = container.useCases.featureCosts().find((cost) => cost.feature === "oral-practice")?.estimateUsd ?? null;
  return { keyHeld: status !== null, choices, perMinuteUsd };
};

/** Everything a running session holds that is not screen state. */
type Live = {
  run: OralPracticeRun | null;
  bridge: AnswerBridge | null;
  stream: MediaStream | null;
  recording: SessionRecording | null;
  clip: ClipRecording | null;
  id: SessionId | null;
};

const stopStream = (live: Live) => {
  for (const track of live.stream?.getTracks() ?? []) track.stop();
  live.stream = null;
};

/**
 * Spoken practice (product-requirements.md §8.6 practice mode, §14; progress.md D117–D119). Pick a
 * session, check the microphone or choose to type, confirm the estimate, then answer the examiner's
 * questions one at a time. Each question is shown and played; each recorded answer is sent to OpenAI to
 * be written down, and nowhere else [R12]. There is no running transcript: only the question being asked
 * is shown, as the real test gives none (§8.6). At the end the recording of the candidate's answers is
 * kept on this device under architecture.md §9.1's policy, and the transcript is shown.
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
  const [recordingKept, setRecordingKept] = useState<boolean | null>(null);
  const live = useRef<Live>({ run: null, bridge: null, stream: null, recording: null, clip: null, id: null });
  const stepRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const typedId = useId();

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
      void live.current.run?.tick();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running, startedAtMs]);

  // Leaving the page ends a session in progress and lets the microphone go.
  useEffect(() => {
    const current = live.current;
    return () => {
      void current.run?.endByUser();
      stopStream(current);
    };
  }, []);

  // Focus follows each step, to its heading.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    stepRef.current?.focus();
  }, [state.phase]);

  if (container.status === "failed") return <p role="status">{tCommon("loadFailed")}</p>;
  if (container.status !== "ready" || setup === null) return <p role="status">{tCommon("loading")}</p>;
  const { useCases, ids } = container.container;

  const step = (action: Parameters<typeof dispatch>[0]) => {
    moved.current = true;
    dispatch(action);
  };

  const onCheckMic = async () => {
    dispatch({ type: "mic", mic: "listening" });
    try {
      stopStream(live.current);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      live.current.stream = stream;
      const peak = await measureLevel(stream, LEVEL_CHECK_MS, setLevel, browserLevelKit());
      dispatch({ type: "mic", mic: levelVerdict(peak) });
    } catch (error) {
      dispatch({ type: "mic", mic: micFailure(error) });
    }
  };

  const onContinue = async (choice: OralSessionChoice, mode: AnswerMode) => {
    if (mode === "typed") stopStream(live.current);
    const preflight = await useCases.preflightSpend({ feature: "oral-practice", quantity: choice.minutes });
    step({ type: "preflighted", mode, preflight });
  };

  const finish = async (session: OralSession) => {
    const { run, recording, id } = live.current;
    const error = run?.failure() ?? null;
    const failure = error === null ? null : oralFailure(error);
    if (failure === "no-key") setSetup((current) => (current === null ? current : { ...current, keyHeld: false }));
    let evicted = 0;
    const audio = await recording?.finish().catch(() => null);
    if (audio !== null && audio !== undefined && id !== null) {
      try {
        evicted = (await useCases.saveOralAudio({ sessionId: id, audio })).evicted.length;
        setRecordingKept(true);
      } catch {
        setRecordingKept(false);
      }
    } else {
      setRecordingKept(null);
    }
    stopStream(live.current);
    live.current = { run: null, bridge: null, stream: null, recording: null, clip: null, id: null };
    step({ type: "ended", session, evicted, failure });
  };

  const onStart = async (choice: OralSessionChoice, mode: AnswerMode) => {
    const bridge = answerBridge();
    bridge.subscribe((waiting) => dispatch({ type: "question", waiting }));
    const id = sessionId(ids.ulid());
    const { stream } = live.current;
    live.current = {
      ...live.current,
      bridge,
      id,
      recording: mode === "spoken" && stream !== null ? recordSession(stream, browserMediaKit()) : null,
    };
    setElapsedMs(0);
    setTyped("");
    step({ type: "started", nowMs: monotonicNow() });
    try {
      const run = await useCases.startOralPractice({ sessionId: id, scenarioId: choice.scenario.id }, bridge.source);
      live.current.run = run;
      void run.ended.then(finish, () => useCases.oralSession({ sessionId: id }).then((stored) => finish(stored ?? emptySession(id, choice))));
    } catch {
      const stored = await useCases.oralSession({ sessionId: id });
      await finish(stored ?? emptySession(id, choice));
    }
  };

  const onRecord = () => {
    const { stream, recording } = live.current;
    if (stream === null) return;
    live.current.clip = recordClip(stream, browserMediaKit());
    recording?.resume();
    dispatch({ type: "recording" });
  };

  const onStopAndSend = async () => {
    const { clip, recording, bridge } = live.current;
    if (clip === null) return;
    live.current.clip = null;
    dispatch({ type: "sent" });
    const answer = await clip.stop();
    recording?.pause();
    bridge?.submit({ kind: "audio", audio: answer.audio, durationMs: answer.durationMs });
  };

  const onSendTyped = () => {
    const text = typed.trim();
    if (text === "") return;
    if (live.current.bridge?.submit({ kind: "typed", text }) === true) {
      setTyped("");
      dispatch({ type: "sent" });
    }
  };

  const onEnd = async () => {
    dispatch({ type: "ending" });
    const { clip, recording, run } = live.current;
    live.current.clip = null;
    if (clip !== null) {
      await clip.stop();
      recording?.pause();
    }
    await run?.endByUser();
  };

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
                          onClick={() => step({ type: "choose", choice })}
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
      </div>
    );
  }

  const back = (
    <Button variant="ghost" onClick={() => step({ type: "back" })}>
      {t("back")}
    </Button>
  );

  if (state.phase === "mic") {
    const { choice, mic } = state;
    const typeInstead = (
      <Button variant="ghost" onClick={() => void onContinue(choice, "typed")}>
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
              <Button onClick={() => void onCheckMic()}>{t("micCheck")}</Button>
              {typeInstead}
            </div>
          ) : null}
          {mic === "listening" ? (
            <div className="app-stack">
              <Toast tone="info">{t("micListening")}</Toast>
              <label className="app-field">
                <span>{t("micLevel")}</span>
                <meter className="app-meter" min={0} max={0.3} value={Math.min(level, 0.3)} />
              </label>
            </div>
          ) : null}
          {mic === "ok" ? (
            <>
              <Callout tone="correct">{t("micOk")}</Callout>
              <div className="app-actions">
                <Button onClick={() => void onContinue(choice, "spoken")}>{t("micContinue")}</Button>
                {typeInstead}
              </div>
            </>
          ) : null}
          {mic === "quiet" ? (
            <>
              <Callout tone="info">{t("micQuiet")}</Callout>
              <div className="app-actions">
                <Button onClick={() => void onCheckMic()}>{t("micAgain")}</Button>
                <Button variant="secondary" onClick={() => void onContinue(choice, "spoken")}>
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
                <Button onClick={() => void onCheckMic()}>{t("micAgain")}</Button>
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
                {mic === "unsupported" ? null : <Button onClick={() => void onCheckMic()}>{t("micAgain")}</Button>}
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
            <Button onClick={() => void onStart(choice, mode)}>{t("start")}</Button>
            {back}
          </div>
        </div>
      </Card>
    );
  }

  if (state.phase === "running") {
    const { choice, mode, question, waiting, turn, ending } = state;
    const progress = phaseProgress(question, choice);
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
            <Question text={question.text} audio={question.audio} lang={choice.scenario.lang} />
          )}
        </Card>
        {waiting && !ending ? (
          mode === "spoken" ? (
            <div className="app-actions">
              {turn === "recording" ? (
                <>
                  <Button onClick={() => void onStopAndSend()}>{t("stopAndSend")}</Button>
                  <Toast tone="info">{t("recording")}</Toast>
                </>
              ) : (
                <Button onClick={onRecord}>{t("record")}</Button>
              )}
            </div>
          ) : (
            <div className="app-stack">
              <label className="app-field" htmlFor={typedId}>
                <span>{t("typedLabel")}</span>
                <textarea
                  id={typedId}
                  className="app-textarea"
                  lang={choice.scenario.lang}
                  rows={4}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                />
              </label>
              <div className="app-actions">
                <Button onClick={onSendTyped} disabled={typed.trim() === ""}>
                  {t("sendAnswer")}
                </Button>
              </div>
            </div>
          )
        ) : null}
        {!waiting && turn === "sending" && !ending ? <Toast tone="info">{t("listening")}</Toast> : null}
        {ending ? <Toast tone="info">{t("ending")}</Toast> : null}
        <div className="app-actions">
          <Button variant="secondary" onClick={() => void onEnd()} disabled={ending}>
            {t("end")}
          </Button>
        </div>
      </div>
    );
  }

  const { session, evicted, failure, choice } = state;
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
          <p className="app-muted">{t("reportComing")}</p>
        </div>
      </Card>
      <Transcript session={session} lang={choice.scenario.lang} />
      <div className="app-actions">
        <Button onClick={() => step({ type: "back" })}>{t("again")}</Button>
        <Link href="/settings/data" className="app-link pl-focusable">
          {t("dataLink")}
        </Link>
      </div>
    </div>
  );
}

/** A session that never reached the store, for the end screen: no turns, and no reason. */
const emptySession = (id: SessionId, choice: OralSessionChoice): OralSession => ({
  id,
  scenarioId: choice.scenario.id,
  startedAt: new Date(0).toISOString(),
  endedAt: null,
  endReason: null,
  turns: [],
});

/** The question in words and in the examiner's voice, played as it arrives, with a control to hear it again. */
function Question({ text, audio, lang }: { text: string; audio: Blob | null; lang: Lang }) {
  const t = useTranslations("oral");
  const player = useRef<HTMLAudioElement>(null);
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
      <p className="app-oral-question" lang={lang}>
        {text}
      </p>
      {url === null ? null : (
        <>
          <audio ref={player} src={url} aria-label={t("audioLabel")} />
          <div className="app-actions">
            <Button
              variant="ghost"
              onClick={() => {
                if (player.current === null) return;
                player.current.currentTime = 0;
                void player.current.play().catch(() => undefined);
              }}
            >
              {t("playAgain")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** The stored transcript, shown once the session is over (the report is Phase 5 Slice 3's). */
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
