import type { ExamReport } from "@palier/app";
import type { Band, BandCut, Item, ItemId, OptionId, SubSkill } from "@palier/domain";
import { examSubSkillBreakdown } from "@palier/engine";

/**
 * The results screen as a view model (product-requirements.md §8.5, progress.md
 * D84), computed from an `ExamReport` so every rule on the screen is tested here.
 *
 * **Pilots are never revealed** (ruling 9). Every figure below counts scored items
 * only, and the review rows carry nothing that tells a pilot from a scored item:
 * no flag, no class, no different button. The one visible trace is the "of 50"
 * total, which the real score report states too.
 */

export type NearMissUp = {
  readonly band: Band;
  /** Correct answers more that would have reached it. */
  readonly pointsAway: number;
};

export type NearMissDown = {
  readonly band: Band;
  /** Correct answers fewer that would have dropped the result into it. */
  readonly answers: number;
};

export type SubSkillCount = {
  readonly subSkill: SubSkill;
  readonly correct: number;
  readonly total: number;
};

export type ReviewRow = {
  /** 1-based position on the form, as the navigator numbered it. */
  readonly position: number;
  readonly item: Item;
  readonly chosen: OptionId | null;
  readonly correct: boolean;
  /**
   * Whether "add to review queue" shows: every item not already queued (ruling 10).
   * Never keyed to "answered wrong", which would single out wrong pilots, since
   * those alone are not queued at submit (D41).
   */
  readonly canQueue: boolean;
};

export type ResultsView = {
  readonly band: Band;
  readonly raw: number;
  readonly scored: number;
  readonly bandMin: number;
  /**
   * Whether to say where the band starts ("Level C starts at 38"). Not at the bottom
   * band: "X starts at 0" says nothing, and the gap to the next band up says it all.
   */
  readonly namesOwnCut: boolean;
  /** The form's cut table, lowest band first. */
  readonly cuts: readonly BandCut[];
  readonly up: NearMissUp | null;
  readonly down: NearMissDown | null;
  /** Counts per sub-skill, weakest first (ruling 7). */
  readonly subSkills: readonly SubSkillCount[];
  /**
   * Confidence calibration, inferred (ruling 6): "unsure" is an item flagged or
   * whose answer changed. Over answered scored items only.
   */
  readonly sureWrong: number;
  readonly unsureRight: number;
  /** Labels (rulings 1, 2, 3): times paused, extra time, and a retake of a form already seen. */
  readonly pauses: number;
  readonly extraTime: boolean;
  readonly retake: boolean;
  readonly review: readonly ReviewRow[];
};

/**
 * How close the band below is (ruling 8): shown when the result sits within two
 * correct answers of its band's lower cut, that is when losing up to three answers
 * would drop it. "Within 2 of its cut" is read as `raw − bandMin ≤ 2` (D87).
 */
export const NEAR_CUT_BELOW = 2;

const nearMissDown = (raw: number, bandMin: number, cuts: readonly BandCut[]): NearMissDown | null => {
  if (raw - bandMin > NEAR_CUT_BELOW) return null;
  const below = cuts.find((cut) => cut.max === bandMin - 1);
  return below === undefined ? null : { band: below.band, answers: raw - bandMin + 1 };
};

export const resultsView = (report: ExamReport): ResultsView => {
  const { run, form, items, result, queued } = report;
  const { outcome } = result;
  const cuts = [...form.bandCuts].sort((a, b) => a.min - b.min);

  const answers = new Map(run.answers.map((a) => [a.itemId, a]));
  const flagged = new Set<ItemId>(run.flagged);
  let sureWrong = 0;
  let unsureRight = 0;
  for (const scored of result.items) {
    const answer = answers.get(scored.itemId);
    if (scored.pilot || answer === undefined) continue;
    const unsure = flagged.has(scored.itemId) || answer.changedAnswer;
    if (unsure && scored.correct) unsureRight += 1;
    if (!unsure && !scored.correct) sureWrong += 1;
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const inQueue = new Set(queued);
  const review = result.items.flatMap((scored, i): ReviewRow[] => {
    const item = itemById.get(scored.itemId);
    return item === undefined
      ? []
      : [{ position: i + 1, item, chosen: scored.chosen, correct: scored.correct, canQueue: !inQueue.has(item.id) }];
  });

  return {
    band: outcome.band,
    raw: outcome.raw,
    scored: outcome.scored,
    bandMin: outcome.bandMin,
    namesOwnCut: outcome.bandMin > 0,
    cuts,
    up: outcome.next === null ? null : { band: outcome.next.band, pointsAway: outcome.next.pointsAway },
    down: nearMissDown(outcome.raw, outcome.bandMin, cuts),
    subSkills: examSubSkillBreakdown(result, items).map((t) => ({
      subSkill: t.subSkill,
      correct: t.correct,
      total: t.attempted,
    })),
    sureWrong,
    unsureRight,
    pauses: run.resumes ?? 0,
    extraTime: (run.timeAllowance ?? 1) > 1,
    retake: report.retake,
    review,
  };
};
