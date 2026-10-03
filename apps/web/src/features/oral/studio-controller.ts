import type { OralSession, OralSessionChoice, OralSessionCost, OralStudioRun, SaveOralAudioResult } from "@palier/app";
import type { RealtimePeerFactory } from "@palier/adapters/openai";
import type { ScenarioId, SessionId } from "@palier/domain";
import type { VoiceLevels } from "@palier/ui";

import { type MediaKit, type WholeRecording, recordWhole } from "../../lib/oral/recorder";
import { emptySession } from "./practice-controller";
import { type OralFailure, type PracticeAction, oralFailure } from "./practice-view";
import { type StudioAction, spentOf } from "./studio-view";

/** The use cases a studio session needs, as the container binds them. */
export type StudioUseCases = {
  readonly startOralStudio: (
    request: { readonly sessionId: SessionId; readonly scenarioId: ScenarioId; readonly endpoint?: string | null },
    peer: RealtimePeerFactory,
    signal?: AbortSignal,
  ) => Promise<OralStudioRun>;
  readonly oralSession: (request: { readonly sessionId: SessionId }) => Promise<OralSession | null>;
  readonly oralSessionCost: (request: { readonly sessionId: SessionId }) => Promise<OralSessionCost | null>;
  readonly saveOralAudio: (request: { readonly sessionId: SessionId; readonly audio: Blob }) => Promise<SaveOralAudioResult>;
};

/** A level being read from a stream, as `lib/oral/level.ts`'s kit opens one. */
export type LevelSource = { readonly read: () => number; readonly close: () => void };

export type StudioControllerDeps = {
  readonly useCases: StudioUseCases;
  readonly newSessionId: () => SessionId;
  /** Mark the session as running in this page until the release is called (D144). */
  readonly holdSession: (id: SessionId) => () => void;
  /** The browser's peer over the microphone and the examiner's audio element: the container's `realtimePeer`. */
  readonly peer: (microphone: MediaStream, remoteAudio: HTMLAudioElement) => RealtimePeerFactory;
  /** An audio element that plays the examiner's voice as soon as it arrives. */
  readonly makeAudio: () => HTMLAudioElement;
  /** Read a stream's level, for the voice form. */
  readonly openLevel: (stream: MediaStream) => LevelSource;
  readonly media: MediaKit;
  /** A monotonic clock in milliseconds, for the elapsed time shown. */
  readonly now: () => number;
  readonly dispatch: (action: StudioAction) => void;
  /** The session is over: the practice screen's end card takes it (D185). */
  readonly onEnded: (ended: Extract<PracticeAction, { type: "ended" }>) => void;
  /** A failure that means the key is gone, so the picker can show the no-key card again. */
  readonly onNoKey: () => void;
};

export type StudioController = {
  /**
   * Start the conversation on the microphone the check opened, which this controller now owns. With the user's own
   * secret endpoint (D192), its popup is opened before anything awaits, so it stays inside the tap's gesture.
   */
  readonly start: (choice: OralSessionChoice, microphone: MediaStream | null, endpoint?: string | null) => Promise<void>;
  /** The screen's timer: let the session look at the clock, then read its phase and its cost so far. */
  readonly tick: () => Promise<void>;
  /** "I did not understand, could you repeat" (D180). */
  readonly repeat: () => Promise<void>;
  readonly end: () => Promise<void>;
  /** The two voices' levels now, for the voice form: the examiner's once its audio has arrived, and the microphone's. */
  readonly levels: () => VoiceLevels;
  readonly attach: () => void;
  /** The screen went away: end a session in progress; the end lets the microphone go. */
  readonly dispose: () => void;
};

const ignore = (): void => undefined;

/** A level that reads silence: a stream Web Audio could not open. */
const SILENT: LevelSource = { read: () => 0, close: ignore };

const isStream = (value: unknown): value is MediaStream =>
  typeof value === "object" && value !== null && typeof (value as { getAudioTracks?: unknown }).getAudioTracks === "function";

/**
 * Studio mode's session, outside React (product-requirements.md §8.6, architecture.md §8.5, progress.md D185), as
 * `practice-controller.ts` is practice mode's. The `.tsx` renders the reducer's state and calls these.
 *
 * - **It owns the microphone from the start**, handed over by the check, and the examiner's audio element, and
 *   lets both go when the session ends, however it ends.
 * - **The whole session is recorded, the microphone only** (architecture.md §8.5 step 8, D183), from the tap, so
 *   the recording runs on the session's own clock to within the moments the call takes to set up. It is kept on
 *   this device by `saveOralAudio`; a session that never connected keeps none.
 * - **The session is held as running in this page** (D144), from before it is stored until it ends.
 * - **End before the run exists cancels the dial**: End, or leaving the page, while the call is still being set up
 *   aborts it, so the microphone is not held for a call nobody wants. An end the candidate asked for is never named
 *   as a failure.
 * - **A failure is named only when the connection failed.** The realtime transport keeps a server's error without
 *   ending, so a session the candidate ended is never reported as failed because of one.
 * - **Each tick reads the phase and the cost so far** from the session's own ledger rows (D182).
 */
export const studioController = (deps: StudioControllerDeps): StudioController => {
  let stream: MediaStream | null = null;
  let audio: HTMLAudioElement | null = null;
  let run: OralStudioRun | null = null;
  let recording: WholeRecording | null = null;
  let id: SessionId | null = null;
  let busy = false;
  let finished = true;
  let disposed = false;
  let endRequested = false;
  let repeating = false;
  let release: (() => void) | null = null;
  /** Cancels the dial while no run exists yet. */
  let dial: AbortController | null = null;
  let micLevel: LevelSource | null = null;
  let voiceLevel: LevelSource | null = null;
  let voiceSource: MediaStream | null = null;

  const open = (source: MediaStream): LevelSource => {
    try {
      return deps.openLevel(source);
    } catch {
      return SILENT;
    }
  };

  const letGo = (): void => {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
    if (audio !== null) {
      audio.pause();
      audio.srcObject = null;
    }
    audio = null;
    micLevel?.close();
    voiceLevel?.close();
    micLevel = null;
    voiceLevel = null;
    voiceSource = null;
  };

  const finish = async (session: OralSession, failure: OralFailure | null, keepRecording: boolean): Promise<void> => {
    if (finished) return;
    finished = true;
    release?.();
    release = null;
    if (failure === "no-key") deps.onNoKey();
    const pending = recording;
    recording = null;
    const recorded = (await pending?.finish().catch(() => null)) ?? null;
    let evicted = 0;
    let recordingKept: boolean | null = null;
    if (keepRecording && recorded !== null && id !== null) {
      try {
        evicted = (await deps.useCases.saveOralAudio({ sessionId: id, audio: recorded })).evicted.length;
        recordingKept = true;
      } catch {
        recordingKept = false;
      }
    }
    letGo();
    run = null;
    id = null;
    dial = null;
    if (disposed) return;
    deps.onEnded({ type: "ended", session, evicted, failure, recordingKept });
    deps.dispatch({ type: "reset" });
  };

  /** The driver's `ended` rejected: close the transport, and end with what was stored. */
  const recover = async (error: unknown, choice: OralSessionChoice, sessionId: SessionId): Promise<void> => {
    await run?.endByUser().catch(ignore);
    const stored = await deps.useCases.oralSession({ sessionId }).catch(() => null);
    await finish(stored ?? emptySession(sessionId, choice), oralFailure(error), true);
  };

  /** How the run ended, in the screen's words: a failure only when the connection failed. */
  const ended = (session: OralSession): Promise<void> => {
    const kept = run?.failure() ?? null;
    return finish(session, session.endReason === "transport-failed" ? oralFailure(kept) : null, true);
  };

  return {
    start: async (choice, microphone, endpoint = null) => {
      if (busy || !finished) return;
      busy = true;
      finished = false;
      endRequested = false;
      const sessionId = deps.newSessionId();
      id = sessionId;
      release = deps.holdSession(sessionId);
      deps.dispatch({ type: "started", choice, nowMs: deps.now() });
      try {
        if (microphone === null) throw new Error("The microphone was not open.");
        stream = microphone;
        const player = deps.makeAudio();
        audio = player;
        try {
          recording = recordWhole(microphone, deps.media);
        } catch {
          recording = null;
        }
        dial = new AbortController();
        const started = await deps.useCases.startOralStudio(
          { sessionId, scenarioId: choice.scenario.id, ...(endpoint === null ? {} : { endpoint }) },
          deps.peer(microphone, player),
          dial.signal,
        );
        run = started;
        if (!disposed) deps.dispatch({ type: "connected" });
        if (endRequested || disposed) void started.endByUser().catch(ignore);
        void started.ended.then(ended, (error: unknown) => recover(error, choice, sessionId));
      } catch (error) {
        const stored = await deps.useCases.oralSession({ sessionId }).catch(() => null);
        // A dial the candidate cancelled is not a failure.
        await finish(stored ?? emptySession(sessionId, choice), endRequested ? null : oralFailure(error), false);
      } finally {
        busy = false;
      }
    },

    tick: async () => {
      const current = run;
      const sessionId = id;
      if (current === null || sessionId === null) return;
      await current.tick();
      const cost = await deps.useCases.oralSessionCost({ sessionId }).catch(() => null);
      if (!disposed && run === current) deps.dispatch({ type: "progress", phaseIndex: current.phase(), spent: spentOf(cost) });
    },

    repeat: async () => {
      const current = run;
      if (current === null || repeating) return;
      repeating = true;
      deps.dispatch({ type: "repeating", on: true });
      try {
        await current.repeat();
      } catch {
        // Asking again is always possible; a request that did not go is not the session's failure.
      } finally {
        repeating = false;
        if (!disposed) deps.dispatch({ type: "repeating", on: false });
      }
    },

    end: async () => {
      deps.dispatch({ type: "ending" });
      endRequested = true;
      if (run === null) dial?.abort();
      await run?.endByUser();
    },

    levels: () => {
      if (stream !== null && micLevel === null) micLevel = open(stream);
      const remote = audio?.srcObject;
      if (isStream(remote) && remote !== voiceSource) {
        voiceLevel?.close();
        voiceLevel = open(remote);
        voiceSource = remote;
      }
      return { examiner: voiceLevel?.read() ?? 0, candidate: micLevel?.read() ?? 0 };
    },

    attach: () => {
      disposed = false;
    },

    dispose: () => {
      disposed = true;
      endRequested = true;
      if (run === null) dial?.abort();
      void run?.endByUser().catch(ignore);
    },
  };
};
