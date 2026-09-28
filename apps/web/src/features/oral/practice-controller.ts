import type { OralPracticeRun, OralSession, OralSessionChoice, SaveOralAudioResult } from "@palier/app";
import type { ScenarioId, SessionId } from "@palier/domain";
import type { Preflight } from "@palier/engine";

import {
  type ClipRecording,
  type MediaKit,
  type SessionRecording,
  recordClip,
  recordSession,
} from "../../lib/oral/recorder";
import { type AnswerBridge, answerBridge } from "./answer-bridge";
import { levelVerdict, micFailure } from "./mic";
import { type AnswerMode, type OralFailure, type PracticeAction, type QuestionHeard, answerPause, oralFailure } from "./practice-view";

/** The use cases the screen's session needs, as the container binds them. */
export type PracticeUseCases = {
  readonly preflightSpend: (request: { readonly feature: "oral-practice"; readonly quantity: number }) => Promise<Preflight>;
  readonly startOralPractice: (
    request: { readonly sessionId: SessionId; readonly scenarioId: ScenarioId },
    answers: AnswerBridge["source"],
  ) => Promise<OralPracticeRun>;
  readonly oralSession: (request: { readonly sessionId: SessionId }) => Promise<OralSession | null>;
  readonly saveOralAudio: (request: { readonly sessionId: SessionId; readonly audio: Blob }) => Promise<SaveOralAudioResult>;
};

export type PracticeControllerDeps = {
  readonly useCases: PracticeUseCases;
  readonly newSessionId: () => SessionId;
  /** Open the microphone (`getUserMedia`). */
  readonly openMic: () => Promise<MediaStream>;
  /** Listen for the level check, reporting each reading, and settle with the loudest. */
  readonly measureLevel: (stream: MediaStream, onLevel: (level: number) => void) => Promise<number>;
  readonly media: MediaKit;
  /** A monotonic clock in milliseconds, for the elapsed time shown. */
  readonly now: () => number;
  readonly dispatch: (action: PracticeAction) => void;
  readonly onLevel: (level: number) => void;
  /** A failure that means the key is gone, so the screen can show the no-key card again. */
  readonly onNoKey: () => void;
};

export type PracticeController = {
  readonly checkMic: () => Promise<void>;
  readonly continueWith: (choice: OralSessionChoice, mode: AnswerMode) => Promise<void>;
  readonly back: () => void;
  readonly start: (choice: OralSessionChoice, mode: AnswerMode) => Promise<void>;
  readonly record: () => void;
  readonly stopAndSend: () => Promise<void>;
  readonly sendTyped: (text: string) => boolean;
  /** The question's voice began playing, or played again: the candidate is listening (D127). */
  readonly questionPlaying: () => void;
  /** The question's voice stopped, ended or paused, or could not play: it has been heard (D127). */
  readonly questionHeard: () => void;
  /** The screen's timer: let the session look at the clock (a phase boundary, or its end). */
  readonly tick: () => Promise<void>;
  readonly end: () => Promise<void>;
  /**
   * The screen is on the page. Paired with `dispose`, so a screen that is mounted, unmounted and
   * mounted again (React's Strict Mode, in development) keeps a working controller (D121).
   */
  readonly attach: () => void;
  /** The screen went away: end a session in progress and let the microphone go. */
  readonly dispose: () => void;
};

/** A session that never reached the store, for the end screen: no turns, and no reason. */
const emptySession = (id: SessionId, choice: OralSessionChoice): OralSession => ({
  id,
  scenarioId: choice.scenario.id,
  startedAt: new Date(0).toISOString(),
  endedAt: null,
  endReason: null,
  turns: [],
  assessment: null,
});

const ignore = (): void => undefined;

/**
 * The spoken-practice screen's session, outside React (progress.md D119, D121): the microphone, the
 * level check, the recorders, the practice run and its end, over deps a test can fake. The `.tsx`
 * renders the reducer's state and calls these; everything that decides lives here, tested.
 *
 * - **The microphone is let go on every way out**: Back, a failed check, a typed session, the end,
 *   and the screen going away. A check that finishes after the user moved on is dropped.
 * - **Each step runs once**: a second tap while a pre-flight or a start is in flight does nothing.
 * - **End before the run exists is kept**, and applied the moment it does.
 * - **A recorder that cannot start** turns the rest of the session to typing rather than leaving a
 *   dead button, and a clip is only ever kept once its recorder is running.
 * - **A session whose driver fails** is closed, and named as failed, with the transcript it stored.
 */
export const practiceController = (deps: PracticeControllerDeps): PracticeController => {
  let stream: MediaStream | null = null;
  let check = 0;
  let busy = false;
  let disposed = false;
  let run: OralPracticeRun | null = null;
  let bridge: AnswerBridge | null = null;
  let recording: SessionRecording | null = null;
  let clip: ClipRecording | null = null;
  let id: SessionId | null = null;
  let endRequested = false;
  let finished = true;
  let question: QuestionHeard | null = null;
  let pauseMs: number | undefined;

  const stopStream = (): void => {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
  };

  const finish = async (session: OralSession, failed: OralFailure | null): Promise<void> => {
    if (finished) return;
    finished = true;
    const kept = run?.failure() ?? null;
    const failure = failed ?? (kept === null ? null : oralFailure(kept));
    if (failure === "no-key") deps.onNoKey();
    const pendingClip = clip;
    clip = null;
    await pendingClip?.stop().catch(ignore);
    const audio = (await recording?.finish().catch(() => null)) ?? null;
    let evicted = 0;
    let recordingKept: boolean | null = null;
    if (audio !== null && id !== null) {
      try {
        evicted = (await deps.useCases.saveOralAudio({ sessionId: id, audio })).evicted.length;
        recordingKept = true;
      } catch {
        recordingKept = false;
      }
    }
    stopStream();
    run = null;
    bridge = null;
    recording = null;
    id = null;
    if (!disposed) deps.dispatch({ type: "ended", session, evicted, failure, recordingKept });
  };

  /** The driver's `ended` rejected: close the transport, and end with what was stored. */
  const recover = async (error: unknown, choice: OralSessionChoice, sessionId: SessionId): Promise<void> => {
    await run?.endByUser().catch(ignore);
    const stored = await deps.useCases.oralSession({ sessionId }).catch(() => null);
    await finish(stored ?? emptySession(sessionId, choice), oralFailure(error));
  };

  return {
    checkMic: async () => {
      const mine = ++check;
      deps.dispatch({ type: "mic", mic: "listening" });
      stopStream();
      try {
        const opened = await deps.openMic();
        if (mine !== check || disposed) {
          for (const track of opened.getTracks()) track.stop();
          return;
        }
        stream = opened;
        const peak = await deps.measureLevel(opened, deps.onLevel);
        if (mine !== check || disposed) return;
        deps.dispatch({ type: "mic", mic: levelVerdict(peak) });
      } catch (error) {
        if (mine !== check || disposed) return;
        stopStream();
        deps.dispatch({ type: "mic", mic: micFailure(error) });
      }
    },

    continueWith: async (choice, requested) => {
      if (busy) return;
      busy = true;
      check += 1;
      const mode: AnswerMode = requested === "spoken" && stream !== null ? "spoken" : "typed";
      if (mode === "typed") stopStream();
      try {
        const preflight = await deps.useCases.preflightSpend({ feature: "oral-practice", quantity: choice.minutes });
        if (!disposed) deps.dispatch({ type: "preflighted", mode, preflight });
      } finally {
        busy = false;
      }
    },

    back: () => {
      check += 1;
      stopStream();
      deps.dispatch({ type: "back" });
    },

    start: async (choice, requested) => {
      if (busy || !finished) return;
      busy = true;
      finished = false;
      endRequested = false;
      const sessionId = deps.newSessionId();
      id = sessionId;
      bridge = answerBridge();
      bridge.subscribe((waiting) => {
        if (waiting !== null) question = { shownAtMs: deps.now(), voiced: waiting.audio !== null, heardAtMs: null };
        deps.dispatch({ type: "question", waiting });
      });
      let mode: AnswerMode = requested;
      recording = null;
      if (requested === "spoken" && stream !== null) {
        try {
          recording = recordSession(stream, deps.media);
        } catch {
          mode = "typed";
          stopStream();
        }
      } else {
        mode = "typed";
      }
      deps.dispatch({ type: "started", nowMs: deps.now(), mode });
      try {
        const started = await deps.useCases.startOralPractice({ sessionId, scenarioId: choice.scenario.id }, bridge.source);
        run = started;
        if (endRequested || disposed) void started.endByUser().catch(ignore);
        void started.ended.then(
          (session) => finish(session, null),
          (error: unknown) => recover(error, choice, sessionId),
        );
      } catch (error) {
        const stored = await deps.useCases.oralSession({ sessionId }).catch(() => null);
        await finish(stored ?? emptySession(sessionId, choice), oralFailure(error));
      } finally {
        busy = false;
      }
    },

    record: () => {
      if (stream === null || clip !== null) return;
      try {
        pauseMs = question === null ? undefined : answerPause(question, deps.now());
        recording?.resume();
        clip = recordClip(stream, deps.media);
        deps.dispatch({ type: "recording" });
      } catch {
        recording?.pause();
        clip = null;
        deps.dispatch({ type: "recordFailed" });
      }
    },

    stopAndSend: async () => {
      const current = clip;
      if (current === null) return;
      clip = null;
      deps.dispatch({ type: "sent" });
      const answer = await current.stop();
      recording?.pause();
      const measured = pauseMs;
      pauseMs = undefined;
      bridge?.submit({
        kind: "audio",
        audio: answer.audio,
        durationMs: answer.durationMs,
        ...(measured === undefined ? {} : { pauseMs: measured }),
      });
    },

    questionPlaying: () => {
      if (question !== null) question = { ...question, heardAtMs: null };
    },

    questionHeard: () => {
      if (question !== null) question = { ...question, heardAtMs: deps.now() };
    },

    sendTyped: (text) => {
      const words = text.trim();
      if (words === "" || bridge?.submit({ kind: "typed", text: words }) !== true) return false;
      deps.dispatch({ type: "sent" });
      return true;
    },

    tick: () => run?.tick() ?? Promise.resolve(),

    end: async () => {
      deps.dispatch({ type: "ending" });
      endRequested = true;
      const current = clip;
      clip = null;
      if (current !== null) {
        await current.stop().catch(ignore);
        recording?.pause();
      }
      await run?.endByUser();
    },

    attach: () => {
      disposed = false;
    },

    dispose: () => {
      disposed = true;
      check += 1;
      endRequested = true;
      void clip?.stop().catch(ignore);
      clip = null;
      void run?.endByUser().catch(ignore);
      stopStream();
    },
  };
};
