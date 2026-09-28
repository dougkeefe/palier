import type { ExaminerQuestion, OralSession, OralSessionChoice } from "@palier/app";
import type { OralEndReason } from "@palier/domain";
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

export type PracticeState =
  | { readonly phase: "picking" }
  | { readonly phase: "mic"; readonly choice: OralSessionChoice; readonly mic: MicState }
  | { readonly phase: "confirming"; readonly choice: OralSessionChoice; readonly mode: AnswerMode; readonly preflight: Preflight }
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
    };

export type PracticeAction =
  | { readonly type: "choose"; readonly choice: OralSessionChoice }
  | { readonly type: "mic"; readonly mic: MicState }
  | { readonly type: "preflighted"; readonly mode: AnswerMode; readonly preflight: Preflight }
  | { readonly type: "back" }
  | { readonly type: "started"; readonly nowMs: number }
  | { readonly type: "question"; readonly waiting: ExaminerQuestion | null }
  | { readonly type: "recording" }
  | { readonly type: "sent" }
  | { readonly type: "ending" }
  | {
      readonly type: "ended";
      readonly session: OralSession | null;
      readonly evicted: number;
      readonly failure: OralFailure | null;
    };

export const INITIAL_PRACTICE: PracticeState = { phase: "picking" };

/**
 * The screen's steps: pick a session, check the microphone (or choose to type), confirm the
 * estimate, then run it until it ends. An action that does not belong to the current step is
 * ignored, so a late event (a question after the end, a tap during the check) never moves it.
 */
export const practice = (state: PracticeState, action: PracticeAction): PracticeState => {
  if (action.type === "back") return INITIAL_PRACTICE;
  switch (state.phase) {
    case "picking":
      return action.type === "choose" ? { phase: "mic", choice: action.choice, mic: "idle" } : state;
    case "mic":
      if (action.type === "mic") return { ...state, mic: action.mic };
      if (action.type === "preflighted") {
        return { phase: "confirming", choice: state.choice, mode: action.mode, preflight: action.preflight };
      }
      return state;
    case "confirming":
      if (action.type !== "started") return state;
      return {
        phase: "running",
        choice: state.choice,
        mode: state.mode,
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
        case "sent":
          return { ...state, turn: "sending" };
        case "ending":
          return { ...state, ending: true };
        case "ended":
          return { phase: "ended", choice: state.choice, session: action.session, evicted: action.evicted, failure: action.failure };
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

/**
 * The recordings' size in megabytes for the data settings, at least a tenth so a single short
 * recording never reads as nothing (the estimate is Palier's own audio, D115).
 */
export const recordingsMegabytes = (bytes: number): number => (bytes <= 0 ? 0 : Math.max(0.1, bytes / 1_000_000));
