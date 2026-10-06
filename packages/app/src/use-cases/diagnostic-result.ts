import type {
  DiagnosticInterpretation,
  DiagnosticInterpretationRequest,
  DiagnosticMiss,
  DiagnosticRules,
  Item,
  ItemId,
  Lang,
  ScoredSkill,
  ScoredSubSkill,
  SubSkill,
  TargetBand,
} from "@palier/domain";
import {
  type DayPlacement,
  type DiagnosticRun,
  type DiagnosticSummary,
  latestCompleteRun,
  summariseDiagnostic,
} from "@palier/engine";

import type { AttemptStore, DiagnosticReportStore, ItemRepository, OralStore } from "../ports/index.js";
import { type MeteredAiDeps, withAiProvider } from "./api-key.js";
import { oralFocusSubSkills } from "./oral-report.js";

/**
 * The diagnostic's result (product-requirements.md 6.2, ADR 25). The score and the placement
 * are the engine's, derived from the attempt log whenever they are asked for and never stored
 * (ADR 16), so every device that holds the run's attempts shows the same. The written
 * interpretation is the model's, paid for once on the user's key and kept on this device.
 *
 * Three readers: the result screen and Today's card read `diagnosticResult`; the screen asks
 * for the words with `requestDiagnosticInterpretation`; and the planner reads the placement
 * through `studyFocus`, beside the latest oral report's fixes.
 */

/**
 * How many recent attempts to read for the latest run. Generous, so a run is not crowded out
 * by the drills since, as `diagnosticReadout`'s window was (D47). A run older than this is no
 * longer read, and Today offers the diagnostic again.
 */
const RECENT_ATTEMPTS_FETCHED = 1000;

const DAY_MS = 86_400_000;

export type DiagnosticResultRequest = {
  readonly skill: ScoredSkill;
  /** The user's target, which the plan's starting band never exceeds. */
  readonly targetBand: TargetBand;
};

export type DiagnosticResultDeps = {
  readonly clock: MeteredAiDeps["clock"];
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
  readonly reports: Pick<DiagnosticReportStore, "get">;
  readonly rules: DiagnosticRules;
};

export type DiagnosticResult = {
  readonly summary: DiagnosticSummary;
  /** The stored interpretation, or `null` when this device has none for the run yet. */
  readonly interpretation: DiagnosticInterpretation | null;
  /** The language the stored interpretation is written in, or `null` with none, so a screen in another can offer it again. */
  readonly interpretationLang: Lang | null;
  /** True once the profile's `retakeDays` have passed since the run (PRD 6.2's monthly offer). */
  readonly retakeDue: boolean;
};

/** An interpretation was asked for at a skill with no complete diagnostic run. */
export class NoDiagnosticRunError extends Error {
  constructor(skill: ScoredSkill) {
    super(`There is no complete ${skill} diagnostic to interpret.`);
    this.name = "NoDiagnosticRunError";
  }
}

type ReadRun = { readonly run: DiagnosticRun; readonly items: readonly Item[]; readonly summary: DiagnosticSummary };

const readLatestRun = async (
  skill: ScoredSkill,
  targetBand: TargetBand,
  deps: Pick<DiagnosticResultDeps, "items" | "attempts" | "rules">,
): Promise<ReadRun | null> => {
  const recent = await deps.attempts.recent(skill, RECENT_ATTEMPTS_FETCHED);
  const run = latestCompleteRun(skill, recent, deps.rules.size);
  if (run === null) return null;
  // `Attempt` carries no band or sub-skill, so the run is joined to its items (engine invariant).
  const items = await deps.items.byIds([...new Set<ItemId>(run.attempts.map((attempt) => attempt.itemId))]);
  return { run, items, summary: summariseDiagnostic(skill, run, items, deps.rules, targetBand) };
};

/** The latest complete diagnostic run at `skill`, read back, or `null` when there is none. */
export const diagnosticResult = async (
  request: DiagnosticResultRequest,
  deps: DiagnosticResultDeps,
): Promise<DiagnosticResult | null> => {
  const read = await readLatestRun(request.skill, request.targetBand, deps);
  if (read === null) return null;
  const report = await deps.reports.get(read.summary.sessionId);
  const age = new Date(deps.clock.now()).getTime() - new Date(read.summary.takenAt).getTime();
  return {
    summary: read.summary,
    interpretation: report?.interpretation ?? null,
    interpretationLang: report?.feedbackLang ?? null,
    retakeDue: age >= deps.rules.retakeDays * DAY_MS,
  };
};

export type DiagnosticInterpretationRequestInput = DiagnosticResultRequest & {
  /** The language the bank's items are in. */
  readonly lang: Lang;
  /** The interface language, which the interpretation is written in. */
  readonly feedbackLang: Lang;
};

export type DiagnosticInterpretationDeps = MeteredAiDeps &
  Omit<DiagnosticResultDeps, "reports" | "clock"> & {
    readonly reports: DiagnosticReportStore;
  };

const missOf = (item: Item, chosen: DiagnosticMiss["chosen"], feedbackLang: Lang): DiagnosticMiss => ({
  subSkill: item.subSkill as ScoredSubSkill,
  band: item.targetBand,
  type: item.type,
  stem: item.stem[item.lang],
  options: item.options.map((option) => ({ id: option.id, text: option.text })),
  chosen,
  key: item.key,
  explanation: item.explanation[feedbackLang],
});

/**
 * What the model is sent for a run: the engine's score and placement, and each item missed,
 * so it can say what the misses share.
 */
const interpretationRequestOf = (
  read: ReadRun,
  request: DiagnosticInterpretationRequestInput,
): DiagnosticInterpretationRequest => {
  const byId = new Map<ItemId, Item>(read.items.map((item) => [item.id, item]));
  const missed = read.run.attempts.flatMap((attempt) => {
    const item = byId.get(attempt.itemId);
    return attempt.correct || item === undefined ? [] : [missOf(item, attempt.chosen, request.feedbackLang)];
  });
  const { summary } = read;
  return {
    skill: request.skill,
    lang: request.lang,
    feedbackLang: request.feedbackLang,
    targetBand: summary.targetBand,
    startBand: summary.startBand,
    total: summary.total,
    bands: summary.bands,
    subSkills: summary.subSkills.map((tally) => ({ ...tally, subSkill: tally.subSkill as ScoredSubSkill })),
    focus: summary.focusSubSkills as readonly ScoredSubSkill[],
    missed,
  };
};

/**
 * The latest run's written interpretation (ADR 25): the stored one when this device has it in
 * the language asked for, spending nothing, so a revisit or a double tap never pays twice; otherwise one
 * `interpretDiagnostic` call through `withAiProvider`, metered as `diagnostic-interpretation`
 * under the run's session, then kept. A failed call stores nothing and rethrows, so the score
 * stays on screen and the request can be made again.
 */
export const requestDiagnosticInterpretation = async (
  request: DiagnosticInterpretationRequestInput,
  deps: DiagnosticInterpretationDeps,
): Promise<DiagnosticInterpretation> => {
  const read = await readLatestRun(request.skill, request.targetBand, deps);
  if (read === null) throw new NoDiagnosticRunError(request.skill);
  const sessionId = read.summary.sessionId;
  const stored = await deps.reports.get(sessionId);
  // Kept in the language asked for, it is free; kept in the other, it is written again and replaces it.
  if (stored !== null && stored.feedbackLang === request.feedbackLang) return stored.interpretation;
  const interpretation = await withAiProvider(
    deps,
    "diagnostic-interpretation",
    (ai) => ai.interpretDiagnostic(interpretationRequestOf(read, request)),
    { sessionId },
  );
  await deps.reports.put({
    sessionId,
    skill: request.skill,
    feedbackLang: request.feedbackLang,
    writtenAt: deps.clock.now(),
    interpretation,
  });
  return interpretation;
};

export type StudyFocusRequest = DiagnosticResultRequest & {
  /** The language the day practises, which an oral report's fixes must match (D127). */
  readonly lang: Lang;
};

export type StudyFocusDeps = Pick<DiagnosticResultDeps, "items" | "attempts" | "rules"> & {
  readonly oral: Pick<OralStore, "all">;
};

/**
 * What biases the day's plan, in one place so the plan Today previews is the plan the session
 * opens: the latest oral report's fixes (D124) and the latest diagnostic run's focus, oral
 * first and each once, and the run's placement (ADR 25). Nothing yet, nothing set.
 */
export type StudyFocus = {
  readonly focusSubSkills?: readonly SubSkill[];
  readonly placement?: DayPlacement;
};

export const studyFocus = async (request: StudyFocusRequest, deps: StudyFocusDeps): Promise<StudyFocus> => {
  const scenarioLang = new Map((await deps.items.scenarios()).map((scenario) => [scenario.id, scenario.lang]));
  const oral = oralFocusSubSkills(await deps.oral.all(), request.lang, (id) => scenarioLang.get(id) ?? null);
  const read = await readLatestRun(request.skill, request.targetBand, deps);
  const focus = [...new Set<SubSkill>([...oral, ...(read?.summary.focusSubSkills ?? [])])];
  return {
    ...(focus.length > 0 ? { focusSubSkills: focus } : {}),
    ...(read === null
      ? {}
      : { placement: { startBand: read.summary.startBand, startShare: deps.rules.startShare } }),
  };
};
