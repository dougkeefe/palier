import type { Attempt, Item, ItemId, ScoredSkill, SubSkill } from "@palier/domain";

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

  return [...tallies.entries()]
    .map(([subSkill, t]) => ({ subSkill, attempted: t.attempted, correct: t.correct }))
    .sort(
      (a, b) =>
        a.correct / a.attempted - b.correct / b.attempted ||
        b.attempted - a.attempted ||
        a.subSkill.localeCompare(b.subSkill),
    );
};
