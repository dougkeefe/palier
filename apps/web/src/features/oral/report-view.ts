import type { OralReport, OralSessionCost } from "@palier/app";
import { NothingToAssessError } from "@palier/app";
import type { OralCriterion, OralTurn, OralTurnError, ScoredSubSkill } from "@palier/domain";
import { ORAL_CRITERIA, READING_SUB_SKILLS } from "@palier/domain";
import type { FluencyMetrics, Preflight } from "@palier/engine";

import { type TextSegment, segmentText } from "../writing/inline-errors";
import { type OralFailure, oralFailure } from "./practice-view";

/**
 * The report screen's decisions (product-requirements.md §8.6, "post-session report";
 * progress.md D126), kept out of the `.tsx` so each is tested.
 */

/** Where asking for the report stands, when the session has none yet. */
export type AskState =
  | { readonly kind: "idle" }
  | { readonly kind: "confirming"; readonly preflight: Preflight }
  | { readonly kind: "asking" }
  | { readonly kind: "failed"; readonly failure: OralFailure | "nothing" };

export type ReportState =
  | { readonly phase: "loading" }
  | { readonly phase: "not-found" }
  | { readonly phase: "ready"; readonly report: OralReport; readonly ask: AskState };

export type ReportAction =
  | { readonly type: "loaded"; readonly report: OralReport | null }
  | { readonly type: "preflighted"; readonly preflight: Preflight }
  | { readonly type: "cancel" }
  | { readonly type: "asking" }
  | { readonly type: "failed"; readonly error: unknown };

export const INITIAL_REPORT: ReportState = { phase: "loading" };

/** A failure in words: the key screen's names, or that the session had nothing to assess. */
const askFailure = (error: unknown): OralFailure | "nothing" =>
  error instanceof NothingToAssessError ? "nothing" : oralFailure(error);

/**
 * The steps: loading, then the session, and for one with no report yet, asking for it: the
 * offer, the pre-flight, the call, and a failure that keeps the transcript and offers it again.
 * A report arriving (`loaded` again) replaces the whole view, so the call's answer lands whole.
 * An action from another step is ignored.
 */
export const reportScreen = (state: ReportState, action: ReportAction): ReportState => {
  if (action.type === "loaded") {
    return action.report === null ? { phase: "not-found" } : { phase: "ready", report: action.report, ask: { kind: "idle" } };
  }
  if (state.phase !== "ready") return state;
  switch (action.type) {
    case "preflighted":
      return state.ask.kind === "asking" ? state : { ...state, ask: { kind: "confirming", preflight: action.preflight } };
    case "cancel":
      return state.ask.kind === "asking" ? state : { ...state, ask: { kind: "idle" } };
    case "asking":
      return { ...state, ask: { kind: "asking" } };
    case "failed":
      return { ...state, ask: { kind: "failed", failure: askFailure(action.error) } };
  }
};

/** The message key for a report that could not be had, in the `oralReport` namespace. */
export const askFailureMessage = (failure: OralFailure | "nothing"): string =>
  failure === "nothing" ? "failNothing" : `fail_${failure}`;

/** The criteria in the order the report shows them, each with its message key. */
export const ORAL_CRITERION_ROWS: readonly { readonly criterion: OralCriterion; readonly key: string }[] =
  ORAL_CRITERIA.map((criterion) => ({ criterion, key: `criterion_${criterion}` }));

const READING: ReadonlySet<string> = new Set(READING_SUB_SKILLS);

/**
 * Where a fix is drilled (D124): the practice page of its sub-skill's skill, whose next plan
 * already draws that sub-skill as the weakest are.
 */
export const drillHref = (subSkill: ScoredSubSkill): "/practice/reading" | "/practice/writing" =>
  READING.has(subSkill) ? "/practice/reading" : "/practice/writing";

/** Which skill a fix drills, for the words beside its link. */
export const drillSkill = (subSkill: ScoredSubSkill): "reading" | "writing" =>
  READING.has(subSkill) ? "reading" : "writing";

/** A row of the marked-up transcript: an examiner's words as they were, or a candidate's cut at their errors. */
export type TranscriptRow =
  | { readonly speaker: "examiner"; readonly index: number; readonly text: string }
  | {
      readonly speaker: "candidate";
      readonly index: number;
      readonly typed: boolean;
      readonly segments: readonly TextSegment[];
    };

/**
 * The transcript with each candidate's turn cut at its errors (PRD §8.6: "errors underlined with
 * corrections on hover or tap"). The errors are numbered from 1 across the whole transcript, in
 * reading order, so each correction has one number. The offsets were checked against the turns
 * before they were stored (`checkOralAssessment`, D126).
 */
export const transcriptRows = (turns: readonly OralTurn[], errors: readonly OralTurnError[]): readonly TranscriptRow[] => {
  let numbered = 0;
  return turns.map((turn, index): TranscriptRow => {
    if (turn.speaker === "examiner") return { speaker: "examiner", index, text: turn.text };
    const mine = errors
      .filter((error) => error.turn === index)
      .map(({ start, end, correction, rule }) => ({ start, end, correction, rule }));
    const segments = segmentText(turn.text, mine).map((segment) => {
      if (segment.kind === "plain") return segment;
      return { ...segment, number: numbered + segment.number };
    });
    numbered += mine.length;
    return { speaker: "candidate", index, typed: turn.input === "typed", segments };
  });
};

/** The fluency figures in the form the screen says them: whole words a minute, a pause in tenths of a second. */
export type FluencyWords = {
  readonly measured: boolean;
  readonly wordsPerMinute: number | null;
  readonly fillerCount: number | null;
  readonly pauseSeconds: number | null;
  readonly spokenTurns: number;
};

export const fluencyWords = (fluency: FluencyMetrics): FluencyWords => ({
  measured: fluency.spokenTurns > 0,
  wordsPerMinute: fluency.wordsPerMinute === null ? null : Math.round(fluency.wordsPerMinute),
  fillerCount: fluency.fillerCount,
  pauseSeconds: fluency.meanPauseMs === null ? null : Math.round(fluency.meanPauseMs / 100) / 10,
  spokenTurns: fluency.spokenTurns,
});

/**
 * What the session cost, measured (Phase 5 exit criterion 2, D125): the practice, the report and
 * the two together, from the rows the ledger made for it. `floor` is set when a call could not be
 * priced, so the screen says "at least" rather than show an unpriced call as free (D103).
 */
export const costLines = (cost: OralSessionCost) => ({
  practiceUsd: cost.practiceUsd,
  reportUsd: cost.reportUsd,
  totalUsd: cost.practiceUsd + cost.reportUsd,
  floor: cost.unpriced > 0,
});

/** The words for a past session's state in the list of them. */
export const historyTag = (entry: { readonly assessed: boolean; readonly answered: boolean }): string =>
  entry.assessed ? "historyAssessed" : entry.answered ? "historyUnassessed" : "historyNothing";
