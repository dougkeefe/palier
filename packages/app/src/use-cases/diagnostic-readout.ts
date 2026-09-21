import type { ScoredSkill } from "@palier/domain";
import { type SkillTrend, calculateTrend } from "@palier/engine";

import type { AttemptStore, ItemRepository } from "../ports/index.js";

/**
 * The diagnostic accuracy readout (implementation-plan.md §3.2, `RunDiagnostic`;
 * progress.md D47): accuracy per band tag with a Wilson interval, over the
 * attempts recorded *in diagnostic mode*. It is the R10 / Phase-2 deliverable
 * ("diagnostic → accuracy per band tag with its interval"), and it is a thin
 * wrapper over the engine's `calculateTrend` (architecture.md §7.1) — no new
 * calculation lives here.
 *
 * The sibling to `runDiagnostic`: that one selects the set, the caller answers
 * each item through the existing `answerItem` with `mode: "diagnostic"`, and this
 * reads the result. A short diagnostic will honestly read `"insufficient"` per
 * band until `MIN_EVIDENCE` attempts accrue — that is R10 ("no estimate without
 * evidence and uncertainty"), not a gap to paper over.
 */

/**
 * How many recent attempts to fetch before filtering to diagnostic mode.
 * Generous, so a diagnostic run's attempts are not crowded out of the window by
 * later drills; the engine's `TREND_WINDOW` caps what actually counts. A precise
 * history-window policy is a Phase-2 tuning decision (progress.md D36).
 */
const RECENT_ATTEMPTS_FETCHED = 1000;

export type DiagnosticReadoutRequest = {
  readonly skill: ScoredSkill;
};

export type DiagnosticReadoutDeps = {
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
};

export const diagnosticReadout = async (
  request: DiagnosticReadoutRequest,
  deps: DiagnosticReadoutDeps,
): Promise<SkillTrend> => {
  const recent = await deps.attempts.recent(request.skill, RECENT_ATTEMPTS_FETCHED);
  const diagnostic = recent.filter((attempt) => attempt.mode === "diagnostic");

  // Resolve the answered items so `calculateTrend` can join each attempt to its
  // band tag (`Attempt` carries no band — engine invariant). An attempt whose
  // item is absent from the bank drops out inside `calculateTrend`.
  const items = await deps.items.byIds(diagnostic.map((attempt) => attempt.itemId));

  return calculateTrend(request.skill, diagnostic, items);
};
