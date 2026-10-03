import type { Attempt, AttemptMode, ExamProfile, Item, ScoredSkill } from "@palier/domain";
import {
  type SkillTrend,
  type TrendEvidence,
  type TrendPoint,
  calculateTrend,
  localDay,
  trendEvidence,
  trendHistory,
  weekEnds,
} from "@palier/engine";

import type { AttemptStore, Clock, ItemRepository } from "../ports/index.js";

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

const practiceRecord = async (
  request: PracticeTrendRequest,
  deps: PracticeTrendDeps,
): Promise<{ practice: readonly Attempt[]; items: readonly Item[] }> => {
  const recent = await deps.attempts.recent(request.skill, RECENT_ATTEMPTS_FETCHED);
  const practice = recent.filter((attempt) => PRACTICE_MODES.includes(attempt.mode));
  const items = await deps.items.byIds(practice.map((attempt) => attempt.itemId));
  return { practice, items };
};

export const practiceTrend = async (
  request: PracticeTrendRequest,
  deps: PracticeTrendDeps,
): Promise<SkillTrend> => {
  const { practice, items } = await practiceRecord(request, deps);
  return calculateTrend(request.skill, practice, items);
};

export type PracticeTrendEvidenceDeps = PracticeTrendDeps & {
  readonly profile: ExamProfile;
};

/**
 * What the practice trend rests on, for the readiness card to disclose (PRD §13.0):
 * how many items are behind it, and how many have trusted response statistics under
 * the profile's minimum count. Over the same attempts as `practiceTrend`.
 */
export const practiceTrendEvidence = async (
  request: PracticeTrendRequest,
  deps: PracticeTrendEvidenceDeps,
): Promise<TrendEvidence> => {
  const { practice, items } = await practiceRecord(request, deps);
  return trendEvidence(request.skill, practice, items, deps.profile.itemStatistics);
};

export type PracticeTrendHistoryRequest = {
  readonly skill: ScoredSkill;
  /** How many week-ends to show, the last of them today. A display choice, not exam data. */
  readonly weeks: number;
  /** The device's IANA time zone, so a week ends on the user's Sunday evening, not UTC's. */
  readonly timeZone: string;
};

export type PracticeTrendHistoryDeps = PracticeTrendDeps & {
  readonly clock: Clock;
};

/**
 * The practice trend over time (product-requirements.md §8.9, progress.md D198): the trend as it
 * stood at the end of each of the last `weeks` weeks, today the last, over every practice attempt,
 * so it reads the whole record (`all`, as `progressReport` does) rather than the recent window.
 * The cutoffs are local days in the device's time zone, handed to the engine as plain data (D32).
 */
export const practiceTrendHistory = async (
  request: PracticeTrendHistoryRequest,
  deps: PracticeTrendHistoryDeps,
): Promise<TrendPoint[]> => {
  const practice = (await deps.attempts.all()).filter(
    (a) => a.skill === request.skill && PRACTICE_MODES.includes(a.mode),
  );
  const items = await deps.items.byIds([...new Set(practice.map((a) => a.itemId))]);
  const cutoffs = weekEnds(localDay(deps.clock.now(), request.timeZone), request.weeks);
  return trendHistory(request.skill, practice, items, cutoffs, request.timeZone);
};
