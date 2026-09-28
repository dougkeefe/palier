import type {
  ExamProfile,
  Lang,
  OralAssessment,
  OralEndReason,
  OralFillers,
  OralRequest,
  OralScenario,
  OralSessionType,
  ScenarioId,
  SessionId,
  SubSkill,
} from "@palier/domain";
import type { FluencyMetrics } from "@palier/engine";
import { fluencyMetrics } from "@palier/engine";

import type { CostLedger, ItemRepository, OralSession, OralStore } from "../ports/index.js";
import type { ISO } from "../ports/time.js";
import { type MeteredAiDeps, withAiProvider } from "./api-key.js";
import { UnknownScenarioError } from "./oral.js";

/**
 * The report on a spoken session (product-requirements.md §8.6, architecture.md §8.5;
 * progress.md D126). A session is stored first and assessed second, as writing is (D106):
 * a failed call keeps the transcript, and the report can be asked for again of the same
 * session. The report is kept on the session, on this device only [R12].
 */

export type OralReportDeps = MeteredAiDeps & {
  readonly oral: OralStore;
  readonly items: ItemRepository;
  /** The profile, configuration the root owns (D42): its oral descriptors are quoted (ADR 9). */
  readonly profile: ExamProfile;
};

export type OralReportRequest = {
  readonly sessionId: SessionId;
  /** The interface language, which the evidence, advice and rules are written in. */
  readonly feedbackLang: Lang;
};

/** A report was asked of a session this device does not hold. */
export class UnknownOralSessionError extends Error {
  constructor(readonly sessionId: SessionId) {
    super(`No oral session has the id ${sessionId}.`);
    this.name = "UnknownOralSessionError";
  }
}

/** A report was asked of a session still running: its turns could still grow. */
export class OralSessionRunningError extends Error {
  constructor(readonly sessionId: SessionId) {
    super(`Oral session ${sessionId} has not ended, so it cannot be assessed yet.`);
    this.name = "OralSessionRunningError";
  }
}

/** The candidate said nothing a report could judge: no answer, or only silence. */
export class NothingToAssessError extends Error {
  constructor() {
    super("The session has no answer to assess.");
    this.name = "NothingToAssessError";
  }
}

/** Whether the candidate said anything a report could judge (D126). */
export const hasAnswers = (session: OralSession): boolean =>
  session.turns.some((turn) => turn.speaker === "candidate" && turn.text.trim() !== "");

/**
 * Ask for the report on an ended session (D126), in one metered `oral-assessment` call,
 * recorded under the session (D125), and keep it on the session.
 *
 * - **An assessed session returns its report and spends nothing**, so a second tap never
 *   pays twice.
 * - A session that is unknown, still running, or has no answer is refused **before any
 *   request**, as is one whose scenario the bank no longer holds.
 * - A failed call keeps the session unassessed, so "Try again" asks about the same one.
 */
export const requestOralReport = async (request: OralReportRequest, deps: OralReportDeps): Promise<OralAssessment> => {
  const session = await deps.oral.get(request.sessionId);
  if (session === null) throw new UnknownOralSessionError(request.sessionId);
  if (session.endedAt === null) throw new OralSessionRunningError(request.sessionId);
  if (session.assessment !== null) return session.assessment;
  if (!hasAnswers(session)) throw new NothingToAssessError();
  const scenario = await deps.items.scenario(session.scenarioId);
  if (scenario === null) throw new UnknownScenarioError(session.scenarioId);

  const { descriptors } = deps.profile.oral;
  const lang = request.feedbackLang;
  const oralRequest: OralRequest = {
    sessionType: scenario.sessionType,
    targetBand: scenario.targetBand,
    lang: scenario.lang,
    feedbackLang: lang,
    topic: scenario.topic,
    phases: scenario.phases.map(({ name, intent }) => ({ name, intent })),
    turns: session.turns,
    descriptors: { A: descriptors.A[lang], B: descriptors.B[lang], C: descriptors.C[lang] },
  };
  const assessment = await withAiProvider(deps, "oral-assessment", (ai) => ai.assessOral(oralRequest), {
    sessionId: session.id,
  });
  await deps.oral.put({ ...session, assessment });
  return assessment;
};

/**
 * One line of a session's cost: the priced calls' dollars, how many calls were made, and how
 * many of them the pricing could not price, so the screen says a line is a floor rather than
 * show an unpriced call as free (D103, D127).
 */
export type OralCostLine = {
  readonly usd: number;
  readonly calls: number;
  readonly unpriced: number;
};

/**
 * What a session cost, from the ledger rows made for it (D125): the session's own calls and its
 * report's, apart. A report call that failed after OpenAI billed it is a row too, so `report.calls`
 * can be above zero while the session has no report (D127).
 */
export type OralSessionCost = {
  readonly practice: OralCostLine;
  readonly report: OralCostLine;
};

/**
 * Why a report cannot be asked for, or `null` when it can (D127): the session is still running,
 * has no answer to judge, runs on a scenario the bank no longer holds, or has its report already.
 */
export type OralReportBlock = "running" | "no-answer" | "scenario-gone" | "assessed";

/** A session as its report screen reads it (D126). */
export type OralReport = {
  readonly session: OralSession;
  /** `null` when the bank no longer holds the scenario the session ran. */
  readonly scenario: OralScenario | null;
  readonly fluency: FluencyMetrics;
  readonly cost: OralSessionCost;
  /** Why a report cannot be asked for, or `null` when it can. */
  readonly blocked: OralReportBlock | null;
};

export type OralReportViewDeps = {
  readonly oral: OralStore;
  readonly items: ItemRepository;
  readonly ledger: CostLedger;
  /** The filler list, content data parsed at the root (D123). */
  readonly fillers: OralFillers;
};

/**
 * One session's report, as the screen shows it (D126), or `null` for a session this device
 * does not hold. The fluency figures are computed here from the stored turns (D123), in the
 * scenario's language; with no scenario there is no language, so no filler is counted.
 */
export const oralReport = async (sessionId: SessionId, deps: OralReportViewDeps): Promise<OralReport | null> => {
  const session = await deps.oral.get(sessionId);
  if (session === null) return null;
  const scenario = await deps.items.scenario(session.scenarioId);
  const measured = fluencyMetrics(session.turns, scenario === null ? [] : deps.fillers[scenario.lang]);
  const fluency = scenario === null ? { ...measured, fillerCount: null } : measured;

  const rows = (await deps.ledger.since(session.startedAt)).filter((row) => row.sessionId === session.id);
  const line = (feature: "oral-practice" | "oral-assessment"): OralCostLine => {
    const mine = rows.filter((row) => row.feature === feature);
    return {
      usd: mine.reduce((total, row) => total + (row.costUsd ?? 0), 0),
      calls: mine.length,
      unpriced: mine.filter((row) => row.costUsd === null).length,
    };
  };
  const cost = { practice: line("oral-practice"), report: line("oral-assessment") };

  return { session, scenario, fluency, cost, blocked: reportBlock(session, scenario) };
};

/** Why `session` cannot have a report asked for, the order `requestOralReport` refuses in. */
const reportBlock = (session: OralSession, scenario: OralScenario | null): OralReportBlock | null => {
  if (session.endedAt === null) return "running";
  if (session.assessment !== null) return "assessed";
  if (!hasAnswers(session)) return "no-answer";
  if (scenario === null) return "scenario-gone";
  return null;
};

/** One past session, as the list of them shows it (D126). */
export type OralHistoryEntry = {
  readonly id: SessionId;
  readonly scenarioId: ScenarioId;
  /** `null` when the bank no longer holds the scenario. */
  readonly sessionType: OralSessionType | null;
  readonly startedAt: ISO;
  readonly endReason: OralEndReason;
  readonly assessed: boolean;
  /** Whether it has an answer a report could judge. */
  readonly answered: boolean;
};

/** This device's ended sessions, newest first, each with whether it has a report (D126). */
export const oralHistory = async (deps: {
  readonly oral: OralStore;
  readonly items: ItemRepository;
}): Promise<readonly OralHistoryEntry[]> => {
  const scenarios = new Map((await deps.items.scenarios()).map((scenario) => [scenario.id, scenario]));
  return (await deps.oral.all()).flatMap((session) =>
    session.endReason === null
      ? []
      : [
          {
            id: session.id,
            scenarioId: session.scenarioId,
            sessionType: scenarios.get(session.scenarioId)?.sessionType ?? null,
            startedAt: session.startedAt,
            endReason: session.endReason,
            assessed: session.assessment !== null,
            answered: hasAnswers(session),
          },
        ],
  );
};

/**
 * The sub-skills the latest report's fixes drill, for tomorrow's plan (D124, closing D35): the
 * newest assessed session's **in the language the plan practises** (D127), in their rank order,
 * or none. A French session's weaknesses say nothing about an English plan. `sessions` is newest
 * first, as `OralStore.all` gives them; `langOf` gives a session's scenario's language, or `null`
 * when the bank no longer holds it, and such a session is passed over.
 */
export const oralFocusSubSkills = (
  sessions: readonly OralSession[],
  lang: Lang,
  langOf: (scenarioId: ScenarioId) => Lang | null,
): readonly SubSkill[] =>
  sessions
    .find((session) => session.assessment !== null && langOf(session.scenarioId) === lang)
    ?.assessment?.fixes.map((fix) => fix.subSkill) ?? [];
