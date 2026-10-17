import type { ExaminerQuestion, OralSession, OralSessionChoice } from "@palier/app";
import type { OralEndReason, OralMode, ScenarioId } from "@palier/domain";
import type { Preflight } from "@palier/engine";

import { checkFailure } from "../key/key-view";
import type { MicState } from "./mic";

/**
 * The spoken-practice screen's decisions (product-requirements.md §8.6 practice mode, §14;
 * progress.md D119), kept out of the `.tsx` so each is tested. Every answer is spoken: without a
 * microphone the screen points to the writing workshop and reading drills, never to typing (D234).
 */

/** Why a session failed, in words the screen can say (the key screen's names, D100). */
export type OralFailure =
  | "invalid-key"
  | "out-of-credit"
  | "timeout"
  | "unreachable"
  | "unexpected"
  | "no-key"
  | "failed"
  /** The user's own realtime secret endpoint gave no secret: blocked, closed, silent or refusing (D192). */
  | "endpoint"
  /** Palier's realtime route refused this network for a while: its own rate limit, not OpenAI's (D195). */
  | "throttled";

/** Where the answer to the current question stands. */
export type Turn = "idle" | "recording" | "sending";

/**
 * The screen's steps, for both modes (product-requirements.md §8.6, progress.md D185). `held` is the mode the
 * candidate chose on the picker, and what the estimate priced; absent is practice, as on a stored session.
 * The microphone step is also where the session starts: its estimate is shown beside "Start the session" once
 * the microphone is open, so one tap is the agreement (D237). Studio mode goes on to its own view once started,
 * and comes back to the same end card as practice.
 */
export type PracticeState =
  | { readonly phase: "picking" }
  | {
      readonly phase: "mic";
      readonly choice: OralSessionChoice;
      readonly mic: MicState;
      /** The session's estimate and its place against the cap, once the microphone is open; `null` until then. */
      readonly preflight: Preflight | null;
      readonly held?: OralMode;
    }
  /** A studio conversation, rendered by the studio view from its own controller (D185). */
  | { readonly phase: "studio"; readonly choice: OralSessionChoice }
  | {
      readonly phase: "running";
      readonly choice: OralSessionChoice;
      /** The examiner's latest question, kept on screen while the next is written. */
      readonly question: ExaminerQuestion | null;
      /** Whether that question is waiting for an answer. */
      readonly waiting: boolean;
      readonly turn: Turn;
      /** The last answer's recorder could not start; the next Record tries again (D234). */
      readonly recordFailed: boolean;
      readonly ending: boolean;
      readonly startedAtMs: number;
    }
  | {
      readonly phase: "ended";
      readonly choice: OralSessionChoice;
      readonly session: OralSession | null;
      readonly evicted: number;
      readonly failure: OralFailure | null;
      /** Whether the recording of the answers was kept on this device; `null` when there was none to keep. */
      readonly recordingKept: boolean | null;
    };

export type PracticeAction =
  | { readonly type: "choose"; readonly choice: OralSessionChoice; readonly held?: OralMode }
  | { readonly type: "mic"; readonly mic: MicState }
  /** The session's price, tagged with the session and mode it priced, so a late one for another is dropped (D237). */
  | { readonly type: "preflighted"; readonly preflight: Preflight; readonly scenarioId: ScenarioId; readonly held?: OralMode }
  | { readonly type: "back" }
  /** A studio session started: the studio view takes over until it ends (D185). */
  | { readonly type: "studio" }
  | { readonly type: "started"; readonly nowMs: number }
  | { readonly type: "question"; readonly waiting: ExaminerQuestion | null }
  | { readonly type: "recording" }
  /** The answer's recorder could not start: the question waits for another try (D234). */
  | { readonly type: "recordFailed" }
  | { readonly type: "sent" }
  | { readonly type: "ending" }
  | {
      readonly type: "ended";
      readonly session: OralSession | null;
      readonly evicted: number;
      readonly failure: OralFailure | null;
      readonly recordingKept: boolean | null;
    };

export const INITIAL_PRACTICE: PracticeState = { phase: "picking" };

/** `held` as a step carries it: said only for studio mode, since absent is practice. */
const studioHeld = (held: OralMode | undefined): { readonly held?: OralMode } => (held === "studio" ? { held } : {});

/**
 * Whether the session can be started: the microphone heard something, or the candidate goes on
 * though it was quiet, and the estimate is on the screen beside the button (D237). Every answer
 * is spoken, so without an open microphone it cannot (D234).
 */
export const canStart = (state: PracticeState): boolean =>
  state.phase === "mic" && (state.mic === "ok" || state.mic === "quiet") && state.preflight !== null;

/**
 * The screen's steps: pick a session and a mode, check the microphone, see the estimate and
 * start, then run it until it ends. An action that does not belong to the current step is
 * ignored, so a late event (a question after the end, a tap during the check) never moves it.
 * A studio session leaves for its own view and comes back to the end card (D185).
 */
export const practice = (state: PracticeState, action: PracticeAction): PracticeState => {
  if (action.type === "back") return INITIAL_PRACTICE;
  switch (state.phase) {
    case "picking":
      return action.type === "choose"
        ? { phase: "mic", choice: action.choice, mic: "idle", preflight: null, ...studioHeld(action.held) }
        : state;
    case "mic":
      if (action.type === "mic") return { ...state, mic: action.mic };
      if (action.type === "preflighted") {
        return action.scenarioId === state.choice.scenario.id && action.held === state.held
          ? { ...state, preflight: action.preflight }
          : state;
      }
      if (!canStart(state)) return state;
      if (action.type === "studio") return state.held === "studio" ? { phase: "studio", choice: state.choice } : state;
      if (action.type !== "started" || state.held === "studio") return state;
      return {
        phase: "running",
        choice: state.choice,
        question: null,
        waiting: false,
        turn: "idle",
        recordFailed: false,
        ending: false,
        startedAtMs: action.nowMs,
      };
    case "studio":
      return action.type === "ended"
        ? {
            phase: "ended",
            choice: state.choice,
            session: action.session,
            evicted: action.evicted,
            failure: action.failure,
            recordingKept: action.recordingKept,
          }
        : state;
    case "running":
      switch (action.type) {
        case "question":
          return action.waiting === null
            ? { ...state, waiting: false }
            : { ...state, question: action.waiting, waiting: true, turn: "idle" };
        case "recording":
          return state.waiting ? { ...state, turn: "recording", recordFailed: false } : state;
        case "recordFailed":
          return { ...state, turn: "idle", recordFailed: true };
        // A sent answer ends the wait at once, not when the bridge next speaks: the recorder takes a moment
        // to stop, and while it did, "Record your answer" came back for a question already answered, so a
        // second answer could be recorded to it, and a session ended there lost the next question (D202).
        case "sent":
          return { ...state, waiting: false, turn: "sending" };
        case "ending":
          return { ...state, ending: true };
        case "ended":
          return {
            phase: "ended",
            choice: state.choice,
            session: action.session,
            evicted: action.evicted,
            failure: action.failure,
            recordingKept: action.recordingKept,
          };
        default:
          return state;
      }
    case "ended":
      return state;
  }
};

/** Why a session failed, from the error the transport kept. */
export const oralFailure = (error: unknown): OralFailure => {
  if (error instanceof Error && error.name === "SelfHostedEndpointError") return "endpoint";
  if (error instanceof Error && error.name === "RouteThrottledError") return "throttled";
  const result = checkFailure(error);
  return result.kind === "valid" ? "failed" : result.kind;
};

/** The message key for a failure, in the `oral` namespace. */
export const failureMessage = (failure: OralFailure): string =>
  ({
    "invalid-key": "failInvalidKey",
    "out-of-credit": "failOutOfCredit",
    timeout: "failTimeout",
    unreachable: "failUnreachable",
    unexpected: "failUnexpected",
    "no-key": "failNoKey",
    failed: "failFailed",
    endpoint: "failEndpoint",
    throttled: "failThrottled",
  })[failure];

/** The sentence a session's end is announced with, in the `oral` namespace. */
export const endMessage = (reason: OralEndReason | null): string => {
  switch (reason) {
    case "completed":
      return "endCompleted";
    case "ended-by-user":
      return "endByYou";
    case "transport-failed":
      return "endFailed";
    case "time-cap":
      return "endTimeCap";
    default:
      return "endOther";
  }
};

/**
 * When studio mode's route is woken (D190): on the step before the tap, the microphone check, where the session also
 * starts (D237), of a session held in studio mode. The step is the answer, so the screen wakes it once as it is shown.
 * Practice mode never calls the route.
 */
export const studioWarmup = (state: PracticeState): "mic" | null =>
  state.phase === "mic" && state.held === "studio" ? state.phase : null;

/**
 * The line beside the start button on where the session sends what, in the `oral` namespace (D186, D237). Studio mode's says where the
 * key goes: Palier's route, or the user's own endpoint when this device has one (D192).
 */
export const sendsTo = (studio: boolean, ownEndpoint: boolean): string => {
  if (!studio) return "sendsToSpoken";
  return ownEndpoint ? "sendsToStudioOwn" : "sendsToStudio";
};

/** The picker's studio callout, in the `oral` namespace: the same choice of where the key goes (D186, D192). */
export const studioModeNote = (ownEndpoint: boolean): string => (ownEndpoint ? "studioModeOwn" : "studioMode");

/**
 * A session's estimate: oral practice is priced per minute (D117), so it is the minute's
 * estimate times the session's minutes, or none when the minute is unpriced.
 */
export const sessionEstimate = (perMinuteUsd: number | null, minutes: number): number | null =>
  perMinuteUsd === null ? null : perMinuteUsd * minutes;

/** Which part of the scenario the question belongs to, counted from one, for the phase indicator. */
export const phaseProgress = (question: ExaminerQuestion | null, choice: OralSessionChoice) => ({
  part: (question?.phase ?? 0) + 1,
  of: choice.scenario.phases.length,
});

/** A megabyte as `AUDIO_WARNING_BYTES` counts one (200 × 1,024 × 1,024), so the warning shows at "200 MB" (D121). */
const MEGABYTE = 1_048_576;

/**
 * The recordings' size in megabytes for the data settings, at least a tenth so a single short
 * recording never reads as nothing (the estimate is Palier's own audio, D115).
 */
export const recordingsMegabytes = (bytes: number): number => (bytes <= 0 ? 0 : Math.max(0.1, bytes / MEGABYTE));

/**
 * Where focus goes as a turn moves on (WCAG 2.4.3, D121): to the question when it starts waiting
 * to be answered, and nowhere otherwise, so sending an answer never drops focus to the page and a
 * new question is announced by landing on it.
 */
export const turnFocus = (
  before: { readonly waiting: boolean } | null,
  after: { readonly waiting: boolean },
): "question" | null => (after.waiting && before?.waiting !== true ? "question" : null);

/** Where the question being answered stands, as the screen saw it, for the pause before an answer. */
export type QuestionHeard = {
  /** When the question appeared, on the screen's monotonic clock. */
  readonly shownAtMs: number;
  /** Whether it came with the examiner's voice. */
  readonly voiced: boolean;
  /** When its voice last stopped (ended or paused), or `null` while it plays or before it has. */
  readonly heardAtMs: number | null;
};

/**
 * The candidate's pause before a spoken answer (progress.md D127): from the moment the question had
 * been heard, when its voice stopped, or its appearing when it had none, to the press of Record,
 * whole milliseconds and never below zero. Pressing Record over the voice is no pause at all.
 */
export const answerPause = (question: QuestionHeard, recordAtMs: number): number => {
  if (question.voiced && question.heardAtMs === null) return 0;
  return Math.max(0, Math.round(recordAtMs - (question.heardAtMs ?? question.shownAtMs)));
};
