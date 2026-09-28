import type { OralCostLine, OralReport, OralReportBlock, OralSession, OralSessionCost } from "@palier/app";
import {
  NothingToAssessError,
  OralSessionRunningError,
  UnknownOralSessionError,
  UnknownScenarioError,
  hasAnswers,
} from "@palier/app";
import type { Lang, OralCriterion, OralTurn, OralTurnError, ScoredSubSkill } from "@palier/domain";
import { ORAL_CRITERIA, READING_SUB_SKILLS } from "@palier/domain";
import type { FluencyMetrics, Preflight } from "@palier/engine";

import { moneyText } from "../key/spend-view";
import { type TextSegment, segmentText } from "../writing/inline-errors";
import { type OralFailure, oralFailure } from "./practice-view";

/**
 * The report screen's decisions (product-requirements.md §8.6, "post-session report";
 * progress.md D126), kept out of the `.tsx` so each is tested.
 */

/**
 * Why a report could not be had: the key screen's names for a call that failed, or, for a request
 * refused before any call, why (D127), so a refusal that no retry can mend never blames OpenAI.
 */
export type AskFailure = OralFailure | "nothing" | "running" | "scenario-gone" | "gone";

/** Where asking for the report stands, when the session has none yet. */
export type AskState =
  | { readonly kind: "idle" }
  | { readonly kind: "confirming"; readonly preflight: Preflight }
  | { readonly kind: "asking" }
  | { readonly kind: "failed"; readonly failure: AskFailure };

export type ReportState =
  | { readonly phase: "loading" }
  | { readonly phase: "not-found" }
  /** The session could not be read: the device's storage failed, which is not a missing session (D127). */
  | { readonly phase: "load-failed" }
  | { readonly phase: "ready"; readonly report: OralReport; readonly ask: AskState };

export type ReportAction =
  | { readonly type: "loaded"; readonly report: OralReport | null }
  /** The session read again, keeping where asking stands: its cost after a failed call (D127). */
  | { readonly type: "refreshed"; readonly report: OralReport }
  | { readonly type: "loadFailed" }
  | { readonly type: "preflighted"; readonly preflight: Preflight }
  | { readonly type: "cancel" }
  | { readonly type: "asking" }
  | { readonly type: "failed"; readonly error: unknown };

export const INITIAL_REPORT: ReportState = { phase: "loading" };

const askFailure = (error: unknown): AskFailure => {
  if (error instanceof NothingToAssessError) return "nothing";
  if (error instanceof OralSessionRunningError) return "running";
  if (error instanceof UnknownScenarioError) return "scenario-gone";
  if (error instanceof UnknownOralSessionError) return "gone";
  return oralFailure(error);
};

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
  if (action.type === "loadFailed") return { phase: "load-failed" };
  if (state.phase !== "ready") return state;
  switch (action.type) {
    case "refreshed":
      return { ...state, report: action.report };
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
export const askFailureMessage = (failure: AskFailure): string =>
  failure === "nothing" ? "failNothing" : `fail_${failure}`;

/** Whether a failure can be mended by asking again: a refusal before any call cannot (D127). */
export const canRetry = (failure: AskFailure): boolean =>
  !(["nothing", "running", "scenario-gone", "gone"] as readonly AskFailure[]).includes(failure);

/** The sentence for why a report cannot be asked for, or `null` when one can, or already was. */
export const blockMessage = (blocked: OralReportBlock | null): string | null => {
  switch (blocked) {
    case "running":
      return "stillRunning";
    case "no-answer":
      return "nothingToAssess";
    case "scenario-gone":
      return "scenarioGone";
    default:
      return null;
  }
};

/** Whether a session's end screen links to its report: it was stored, it ended, and it has an answer (D126). */
export const endReportLink = (session: OralSession | null): boolean =>
  session !== null && session.endReason !== null && hasAnswers(session);

/** The report's feedback language: the interface's, French or English. */
export const feedbackLangFor = (locale: string): Lang => (locale === "fr" ? "fr" : "en");

/** The message key for a fix's drill link. */
export const drillMessage = (subSkill: ScoredSubSkill): "drillReading" | "drillWriting" =>
  drillSkill(subSkill) === "reading" ? "drillReading" : "drillWriting";

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

/** Which skill a fix drills. */
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

/** One cost line in words: a message key in the `oralReport` namespace and its values. */
export type CostWords = { readonly key: string; readonly values?: { readonly amount: string } };

/**
 * One amount in words (D127): a line with an unpriced call is "at least" its priced part, so an
 * unpriced call never reads as free (D103), and a figure under half a cent reads as "under a cent",
 * never both at once.
 */
const amountWords = (usd: number, unpriced: number, locale: string): CostWords => {
  const shown = moneyText(usd, locale);
  if (unpriced > 0) return shown.underCent || usd === 0 ? { key: "costFloorFraction" } : { key: "costFloor", values: { amount: shown.text } };
  return shown.underCent ? { key: "costUnderCent", values: { amount: shown.text } } : { key: "costExact", values: { amount: shown.text } };
};

/**
 * What the session cost, measured (Phase 5 exit criterion 2, D125, D127): the practice, the report and
 * the two together, from the rows the ledger made for it. The report line says "not asked for yet"
 * only when no report call was made, since a call OpenAI billed and the adapter refused is spend too.
 */
export const costRows = (cost: OralSessionCost, locale: string): readonly { readonly label: string; readonly words: CostWords }[] => {
  const total: OralCostLine = {
    usd: cost.practice.usd + cost.report.usd,
    calls: cost.practice.calls + cost.report.calls,
    unpriced: cost.practice.unpriced + cost.report.unpriced,
  };
  return [
    { label: "costPractice", words: amountWords(cost.practice.usd, cost.practice.unpriced, locale) },
    {
      label: "costReport",
      words: cost.report.calls === 0 ? { key: "costNoReport" } : amountWords(cost.report.usd, cost.report.unpriced, locale),
    },
    { label: "costTotal", words: amountWords(total.usd, total.unpriced, locale) },
  ];
};

/** The words for a past session's state in the list of them. */
export const historyTag = (entry: { readonly assessed: boolean; readonly answered: boolean }): string =>
  entry.assessed ? "historyAssessed" : entry.answered ? "historyUnassessed" : "historyNothing";

/**
 * Whether asking for the report moved to another step, so its card's heading should take focus
 * (WCAG 2.4.3, D127): at every change of step, but never on the first render, and never when the
 * screen is not showing a session.
 */
export const askFocusMoves = (before: AskState["kind"] | null, after: AskState["kind"] | null): boolean =>
  before !== null && after !== null && before !== after;
