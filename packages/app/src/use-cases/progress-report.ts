import type { ScoredSkill } from "@palier/domain";
import { type SkillTrend, type SubSkillTally, calculateTrend, subSkillBreakdown } from "@palier/engine";

import type { AttemptStore, ItemRepository } from "../ports/index.js";
import { PRACTICE_MODES } from "./practice-trend.js";

/**
 * Everything the progress screen shows for one skill (product-requirements.md §8.9):
 * the practice trend, accuracy by sub-skill, how many items have been answered, and
 * the time spent answering them. Over the **whole** practice record, not a window,
 * and without exam attempts (the D64 line, for the same reason).
 *
 * `msAnswering` is time-to-confirm summed: time spent answering, not time spent in the
 * app, since reading the feedback is not measured. The screen labels it as what it is.
 */
export type ProgressReportRequest = {
  readonly skill: ScoredSkill;
};

export type ProgressReportDeps = {
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
};

export type ProgressReport = {
  readonly trend: SkillTrend;
  readonly bySubSkill: readonly SubSkillTally[];
  readonly answered: number;
  readonly msAnswering: number;
};

export const progressReport = async (
  request: ProgressReportRequest,
  deps: ProgressReportDeps,
): Promise<ProgressReport> => {
  const practice = (await deps.attempts.all()).filter(
    (a) => a.skill === request.skill && PRACTICE_MODES.includes(a.mode),
  );
  const items = await deps.items.byIds([...new Set(practice.map((a) => a.itemId))]);
  return {
    trend: calculateTrend(request.skill, practice, items),
    bySubSkill: subSkillBreakdown(request.skill, practice, items),
    answered: practice.length,
    msAnswering: practice.reduce((sum, a) => sum + a.msToConfirm, 0),
  };
};
