import type { Attempt, Item, ItemId, ScoredSkill, SubSkill } from "@palier/domain";

import type { ExamResult } from "./scorer.js";

/**
 * Accuracy by sub-skill for the progress screen (product-requirements.md §8.9):
 * every attempt at the skill, counted per sub-skill, weakest first (§8.5 sorts "by
 * weakness").
 *
 * It returns **counts, not estimates**. A tally of "7 of 9" makes no claim beyond
 * itself; a percentage on nine answers would imply a precision the evidence lacks,
 * which R10 forbids. The screen decides how to present it.
 *
 * Unlike `weakestSubSkills`, which the planner uses to *target* practice, this has no
 * recency window and no minimum: it is the user's whole record, shown in full.
 */
export type SubSkillTally = {
  readonly subSkill: SubSkill;
  readonly attempted: number;
  readonly correct: number;
};

export const subSkillBreakdown = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  items: readonly Item[],
): readonly SubSkillTally[] => {
  const subSkillOf = new Map<ItemId, SubSkill>(items.map((item) => [item.id, item.subSkill]));
  const tallies = new Map<SubSkill, { attempted: number; correct: number }>();

  for (const attempt of attempts) {
    if (attempt.skill !== skill) continue;
    const subSkill = subSkillOf.get(attempt.itemId);
    // An attempt whose item is no longer in the bank cannot be attributed.
    if (subSkill === undefined) continue;
    const tally = tallies.get(subSkill) ?? { attempted: 0, correct: 0 };
    tally.attempted += 1;
    if (attempt.correct) tally.correct += 1;
    tallies.set(subSkill, tally);
  }

  return ranked(tallies);
};

/** Weakest first: lowest proportion right, then the larger count, then by name. */
const ranked = (tallies: ReadonlyMap<SubSkill, { attempted: number; correct: number }>): readonly SubSkillTally[] =>
  [...tallies.entries()]
    .map(([subSkill, t]) => ({ subSkill, attempted: t.attempted, correct: t.correct }))
    .sort(
      (a, b) =>
        a.correct / a.attempted - b.correct / b.attempted ||
        b.attempted - a.attempted ||
        a.subSkill.localeCompare(b.subSkill),
    );

/**
 * The same tallies for one mock exam's result (product-requirements.md §8.5:
 * "per-sub-skill breakdown, sorted by weakness"), in counts, "4 of 6" (progress.md
 * D84, ruling 7).
 *
 * - **Scored items only.** A pilot does not count towards the score, and a pilot is
 *   never revealed (D84, ruling 9), so a tally that counted pilots would both
 *   disagree with the raw score and give them away.
 * - **Every scored item counts**, answered or not: `attempted` here is the number
 *   of scored items on the sub-skill, because an unanswered item scores as wrong.
 */
export const examSubSkillBreakdown = (result: ExamResult, items: readonly Item[]): readonly SubSkillTally[] => {
  const subSkillOf = new Map<ItemId, SubSkill>(items.map((item) => [item.id, item.subSkill]));
  const tallies = new Map<SubSkill, { attempted: number; correct: number }>();

  for (const scored of result.items) {
    if (scored.pilot) continue;
    const subSkill = subSkillOf.get(scored.itemId);
    if (subSkill === undefined) continue;
    const tally = tallies.get(subSkill) ?? { attempted: 0, correct: 0 };
    tally.attempted += 1;
    if (scored.correct) tally.correct += 1;
    tallies.set(subSkill, tally);
  }

  return ranked(tallies);
};
