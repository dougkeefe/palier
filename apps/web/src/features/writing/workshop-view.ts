import type { WritingSubmission } from "@palier/app";
import type { WritingCriterion } from "@palier/domain";
import type { Preflight } from "@palier/engine";

import { checkFailure } from "../key/key-view";

/**
 * The writing workshop's decisions (product-requirements.md §8.7, §14; progress.md
 * D105–D108), kept out of the `.tsx` so each is tested.
 */

/** Words as the writer counts them: runs of anything but whitespace. */
export const countWords = (text: string): number => {
  const words = text.trim().split(/\s+/u);
  return words[0] === "" ? 0 : words.length;
};

/** Elapsed writing time as the display shows it, `m:ss`, counting up and never enforced. */
export const elapsedText = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1_000));
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
};

/**
 * Whether the draft is short of the prompt's word target, near it, or past it. "Near" is
 * within a tenth either side; a target is a guide, so the tone is a hint and never a block.
 */
export type WordTone = "short" | "near" | "over";

export const wordTone = (count: number, target: number): WordTone => {
  if (count < target * 0.9) return "short";
  if (count > target * 1.1) return "over";
  return "near";
};

/**
 * The word count is announced to a screen reader only at every tenth word and at the
 * target, not on each keystroke, which would drown out the typing (WCAG 4.1.3).
 */
export const announcedCount = (count: number, target: number): number =>
  count >= target ? count : Math.floor(count / 10) * 10;

/** A writing draft: its prompt, its text, when writing began, and the save it matches, if any. */
export type Draft = {
  readonly promptId: string;
  readonly text: string;
  readonly startedAtMs: number;
  /** The last submission saved from this draft. Reused while the text is unchanged. */
  readonly saved: { readonly id: string; readonly text: string } | null;
};

/** Why feedback failed, from the thrown error, as the key screen reads a failed check. */
export type FeedbackFailure =
  | "invalid-key"
  | "out-of-credit"
  | "timeout"
  | "unreachable"
  | "unexpected"
  | "no-key"
  | "empty"
  | "failed";

export const feedbackFailure = (error: unknown): FeedbackFailure => {
  if (error instanceof Error && error.name === "EmptyWritingError") return "empty";
  const result = checkFailure(error);
  return result.kind === "valid" ? "failed" : result.kind;
};

/** The message key for a failure, in the `writing` namespace. */
export const failureMessage = (failure: FeedbackFailure): string =>
  ({
    "invalid-key": "failInvalidKey",
    "out-of-credit": "failOutOfCredit",
    timeout: "failTimeout",
    unreachable: "failUnreachable",
    unexpected: "failUnexpected",
    "no-key": "failNoKey",
    empty: "failEmpty",
    failed: "failFailed",
  })[failure];

export type RequestState =
  | { readonly kind: "idle" }
  | { readonly kind: "confirming"; readonly preflight: Preflight }
  | { readonly kind: "sending" }
  | { readonly kind: "failed"; readonly failure: FeedbackFailure };

export type WorkshopState =
  | { readonly phase: "choosing" }
  | { readonly phase: "writing"; readonly draft: Draft; readonly request: RequestState }
  | { readonly phase: "feedback"; readonly draft: Draft; readonly submission: WritingSubmission };

export type WorkshopAction =
  | { readonly type: "pick"; readonly promptId: string; readonly nowMs: number }
  | { readonly type: "edit"; readonly text: string }
  | { readonly type: "preflighted"; readonly preflight: Preflight }
  | { readonly type: "cancel" }
  | { readonly type: "sending" }
  | { readonly type: "saved"; readonly id: string; readonly text: string }
  | { readonly type: "assessed"; readonly submission: WritingSubmission }
  | { readonly type: "failed"; readonly failure: FeedbackFailure }
  | { readonly type: "revise" }
  | { readonly type: "choose" }
  | { readonly type: "reopen"; readonly submission: WritingSubmission; readonly nowMs: number }
  | { readonly type: "resume"; readonly submission: WritingSubmission; readonly nowMs: number };

export const INITIAL_WORKSHOP: WorkshopState = { phase: "choosing" };

const IDLE: RequestState = { kind: "idle" };

/** The submission to ask feedback for: the draft's last save while its text is unchanged. */
export const reusableSubmission = (draft: Draft): string | null =>
  draft.saved !== null && draft.saved.text === draft.text ? draft.saved.id : null;

export const workshop = (state: WorkshopState, action: WorkshopAction): WorkshopState => {
  switch (action.type) {
    case "pick":
      return {
        phase: "writing",
        draft: { promptId: action.promptId, text: "", startedAtMs: action.nowMs, saved: null },
        request: IDLE,
      };
    case "choose":
      return INITIAL_WORKSHOP;
    case "reopen": {
      const { submission } = action;
      const draft = draftOf(submission, action.nowMs);
      return submission.assessment === null
        ? { phase: "writing", draft, request: IDLE }
        : { phase: "feedback", draft, submission };
    }
    case "resume":
      // Feedback asked for before this screen opened, and still being made (D143): shown as
      // sending, so it is followed rather than asked for, and paid for, again.
      return { phase: "writing", draft: draftOf(action.submission, action.nowMs), request: { kind: "sending" } };
    case "revise":
      return state.phase === "feedback" ? { phase: "writing", draft: state.draft, request: IDLE } : state;
    case "assessed":
      return state.phase === "writing" ? { phase: "feedback", draft: state.draft, submission: action.submission } : state;
    default:
      return state.phase === "writing" ? writing(state, action) : state;
  }
};

/** A saved submission as the draft it was written from. */
const draftOf = (submission: WritingSubmission, nowMs: number): Draft => ({
  promptId: submission.promptId,
  text: submission.text,
  startedAtMs: nowMs,
  saved: { id: submission.id, text: submission.text },
});

/** The actions that only mean something while writing. */
const writing = (
  state: Extract<WorkshopState, { phase: "writing" }>,
  action: Extract<WorkshopAction, { type: "edit" | "preflighted" | "cancel" | "sending" | "saved" | "failed" }>,
): WorkshopState => {
  switch (action.type) {
    case "edit":
      // The text being assessed is fixed until its feedback arrives: an edit now would bring
      // "Get feedback" back mid-call, and a second paid request with it (D143).
      if (state.request.kind === "sending") return state;
      // Editing clears a pending confirmation or a failure: the estimate was for the old text.
      return { ...state, draft: { ...state.draft, text: action.text }, request: IDLE };
    case "preflighted":
      return { ...state, request: { kind: "confirming", preflight: action.preflight } };
    case "cancel":
      return { ...state, request: IDLE };
    case "sending":
      return { ...state, request: { kind: "sending" } };
    case "saved":
      return { ...state, draft: { ...state.draft, saved: { id: action.id, text: action.text } } };
    case "failed":
      return { ...state, request: { kind: "failed", failure: action.failure } };
  }
};

/** The pre-flight's warning, when this call would bring the month near the cap or past it. Never a block. */
export const preflightNotice = (
  preflight: Preflight,
): { readonly key: "preflightNear" | "preflightOver"; readonly tone: "info" | "incorrect" } | null => {
  if (preflight.after === "over") return { key: "preflightOver", tone: "incorrect" };
  if (preflight.after === "near") return { key: "preflightNear", tone: "info" };
  return null;
};

/** The five criteria, each with its message key, in the order the feedback shows them. */
export const criterionLabel = (criterion: WritingCriterion): string => `criterion_${criterion}`;
