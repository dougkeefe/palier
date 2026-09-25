import type { Attempt, Item, ItemId, ScoredSkill, SubSkill } from "@palier/domain";

/**
 * The user's weakest sub-skills, which the selector weights toward
 * (architecture.md §7.2): "accuracy over the last 50 attempts in that sub-skill,
 * minimum 8 attempts to qualify." The three weakest are returned, weakest first.
 *
 * `Attempt` carries no sub-skill, so attempts are joined to their items by id
 * (progress.md D32, the join note); an attempt whose item is absent is ignored.
 */

/** Attempts per sub-skill the accuracy is measured over, most recent first. */
export const WEAKEST_WINDOW = 50;

/** Attempts in a sub-skill before it qualifies to be judged at all. */
export const WEAKEST_MIN = 8;

/** How many of the weakest qualifying sub-skills the selector targets. */
export const WEAKEST_COUNT = 3;

export const weakestSubSkills = (
  skill: ScoredSkill,
  attempts: readonly Attempt[],
  items: readonly Item[],
): readonly SubSkill[] => {
  const subSkillOf = new Map<ItemId, SubSkill>(items.map((item) => [item.id, item.subSkill]));

  // The skill's attempts, most recent first — equal instants by id, so the window is
  // a function of the attempt set, not of arrival order (progress.md D73, D77) — tagged
  // with their sub-skill.
  const tagged = attempts
    .filter((a) => a.skill === skill)
    .sort((a, b) => b.ts.localeCompare(a.ts) || Number(b.id > a.id) - Number(b.id < a.id))
    .flatMap((a) => {
      const subSkill = subSkillOf.get(a.itemId);
      return subSkill === undefined ? [] : [{ subSkill, correct: a.correct }];
    });

  const perSubSkill = new Map<SubSkill, { seen: number; correct: number }>();
  for (const { subSkill, correct } of tagged) {
    const cell = perSubSkill.get(subSkill) ?? { seen: 0, correct: 0 };
    // Only the most recent `WEAKEST_WINDOW` per sub-skill count toward accuracy.
    if (cell.seen >= WEAKEST_WINDOW) continue;
    cell.seen += 1;
    if (correct) cell.correct += 1;
    perSubSkill.set(subSkill, cell);
  }

  return [...perSubSkill.entries()]
    .filter(([, cell]) => cell.seen >= WEAKEST_MIN)
    .map(([subSkill, cell]) => ({ subSkill, accuracy: cell.correct / cell.seen }))
    .sort((a, b) => a.accuracy - b.accuracy || a.subSkill.localeCompare(b.subSkill))
    .slice(0, WEAKEST_COUNT)
    .map((entry) => entry.subSkill);
};
