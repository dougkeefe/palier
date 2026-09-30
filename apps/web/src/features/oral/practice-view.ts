import type { ExaminerQuestion, OralSession, OralSessionChoice } from "@palier/app";
import type { OralEndReason, OralMode } from "@palier/domain";
import type { Preflight } from "@palier/engine";

import { checkFailure } from "../key/key-view";
import type { MicState } from "./mic";

/**
 * The spoken-practice screen's decisions (product-requirements.md §8.6 practice mode, §14;
 * progress.md D119), kept out of the `.tsx` so each is tested.
 */

/** How the candidate answers: by recording, or by typing when the microphone is refused or absent. */
export type AnswerMode = "spoken" | "typed";

/** Why a session failed, in words the screen can say (the key screen's names, D100). */
export type OralFailure = "invalid-key" | "out-of-credit" | "timeout" | "unreachable" | "unexpected" | "no-key" | "failed";

/** Where the answer to the current question stands. */
export type Turn = "idle" | "recording" | "sending";

/**
 * The screen's steps, for both modes (product-requirements.md §8.6, progress.md D185). `held` is the mode the
 * candidate chose on the picker, and what the pre-flight priced; absent is practice, as on a stored session.
 * Studio mode goes on to its own view once started, and comes back to the same end card as practice.
 */
export type PracticeState =
  | { readonly phase: "picking" }
  | { readonly phase: "mic"; readonly choice: OralSessionChoice; readonly mic: MicState; readonly held?: OralMode }
  | {
      readonly phase: "confirming";
      readonly choice: OralSessionChoice;
      readonly mode: AnswerMode;
      readonly preflight: Preflight;
      readonly held?: OralMode;
    }
  /** A studio conversation, rendered by the studio view from its own controller (D185). */
  | { readonly phase: "studio"; readonly choice: OralSessionChoice }
  | {
      readonly phase: "running";
      readonly choice: OralSessionChoice;
      readonly mode: AnswerMode;
      /** The examiner's latest question, kept on screen while the next is written. */
      readonly question: ExaminerQuestion | null;
      /** Whether that question is waiting for an answer. */
      readonly waiting: boolean;
      readonly turn: Turn;
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
  | { readonly type: "preflighted"; readonly mode: AnswerMode; readonly preflight: Preflight; readonly held?: OralMode }
  | { readonly type: "back" }
  /** A studio session started: the studio view takes over until it ends (D185). */
  | { readonly type: "studio" }
  | { readonly type: "started"; readonly nowMs: number; readonly mode?: AnswerMode }
  | { readonly type: "question"; readonly waiting: ExaminerQuestion | null }
  | { readonly type: "recording" }
  /** The recorder could not start: the rest of the session is answered by typing (D121). */
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
 * The screen's steps: pick a session and a mode, check the microphone (or choose to type), confirm the
 * estimate, then run it until it ends. An action that does not belong to the current step is
 * ignored, so a late event (a question after the end, a tap during the check) never moves it.
 * A studio session leaves for its own view and comes back to the end card (D185).
 */
export const practice = (state: PracticeState, action: PracticeAction): PracticeState => {
  if (action.type === "back") return INITIAL_PRACTICE;
  switch (state.phase) {
    case "picking":
      return action.type === "choose" ? { phase: "mic", choice: action.choice, mic: "idle", ...studioHeld(action.held) } : state;
    case "mic":
      if (action.type === "mic") return { ...state, mic: action.mic };
      if (action.type === "preflighted") {
        return {
          phase: "confirming",
          choice: state.choice,
          mode: action.mode,
          preflight: action.preflight,
          ...studioHeld(action.held),
        };
      }
      return state;
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
    case "confirming":
      if (action.type === "studio") return state.held === "studio" ? { phase: "studio", choice: state.choice } : state;
      if (action.type !== "started" || state.held === "studio") return state;
      return {
        phase: "running",
        choice: state.choice,
        mode: action.mode ?? state.mode,
        question: null,
        waiting: false,
        turn: "idle",
        ending: false,
        startedAtMs: action.nowMs,
      };
    case "running":
      switch (action.type) {
        case "question":
          return action.waiting === null
            ? { ...state, waiting: false }
            : { ...state, question: action.waiting, waiting: true, turn: "idle" };
        case "recording":
          return state.waiting ? { ...state, turn: "recording" } : state;
        case "recordFailed":
          return { ...state, mode: "typed", turn: "idle" };
        case "sent":
          return { ...state, turn: "sending" };
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
 * to be answered aloud, to the answer field when it is to be typed, and nowhere otherwise, so
 * sending an answer never drops focus to the page and a new question is announced by landing on it.
 */
export const turnFocus = (
  before: { readonly waiting: boolean } | null,
  after: { readonly waiting: boolean; readonly mode: AnswerMode },
): "question" | "answer" | null => {
  if (!after.waiting || before?.waiting === true) return null;
  return after.mode === "typed" ? "answer" : "question";
};

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
