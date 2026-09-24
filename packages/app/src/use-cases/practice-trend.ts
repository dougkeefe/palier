import type { AttemptMode, ScoredSkill } from "@palier/domain";
import { type SkillTrend, calculateTrend } from "@palier/engine";

import type { AttemptStore, ItemRepository } from "../ports/index.js";

/**
 * The practice trend the readiness card shows (product-requirements.md §8.2 Zone A,
 * "your practice trend, always"): accuracy per band tag with a Wilson interval, over
 * every *practice* attempt for the skill — drills, reviews and the diagnostic.
 *
 * Exam attempts are left out on purpose. §8.2 keeps the last exam result and the
 * practice trend "visually distinct", because the exam is the calibrated instrument
 * and practice is not. Folding exam answers into the trend would blur exactly the
 * line the card exists to draw.
 *
 * The sibling of `diagnosticReadout`, which reads the diagnostic alone (D47). Both
 * are thin wrappers over `calculateTrend`; no calculation lives here (progress.md
 * D64).
 */

/** The modes that count as practice. */
export const PRACTICE_MODES: readonly AttemptMode[] = ["drill", "review", "diagnostic"];

/**
 * How many recent attempts to fetch before filtering out exam attempts. Generous, so
 * a long exam does not crowd practice out of the window; `TREND_WINDOW` caps what
 * counts (the `diagnosticReadout` precedent, D36).
 */
const RECENT_ATTEMPTS_FETCHED = 1000;

export type PracticeTrendRequest = {
  readonly skill: ScoredSkill;
};

export type PracticeTrendDeps = {
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
};

export const practiceTrend = async (
  request: PracticeTrendRequest,
  deps: PracticeTrendDeps,
): Promise<SkillTrend> => {
  const recent = await deps.attempts.recent(request.skill, RECENT_ATTEMPTS_FETCHED);
  const practice = recent.filter((attempt) => PRACTICE_MODES.includes(attempt.mode));
  const items = await deps.items.byIds(practice.map((attempt) => attempt.itemId));
  return calculateTrend(request.skill, practice, items);
};
