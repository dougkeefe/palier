import type { Attempt, Item, ItemId, Lang, ScoredSkill, SubSkill, TargetBand } from "@palier/domain";
import { TARGET_BANDS, bandRank } from "@palier/domain";

import { weakestSubSkills } from "./weakest-sub-skills.js";

/**
 * Item selection (architecture.md §7.2): "A filter and a weighted shuffle. No
 * information functions, no exposure control mechanism." Practice mode weights
 * the user's weakest sub-skills, and any it is asked to boost; diagnostic mode drops the weighting and the
 * working-set restriction, because its job is coverage rather than targeting.
 *
 * `random` and `now` are primitives, not the ports (progress.md D32).
 */

/** An item is not offered again if it was attempted within this many days (§7.2). */
export const RECENT_DAYS = 14;

/** How much more often an item in a weakest sub-skill is drawn (§7.2). */
export const WEAKEST_WEIGHT = 3;

const DAY_MS = 86_400_000;

export type SelectionMode = "practice" | "diagnostic";

export type SelectionCriteria = {
  readonly skill: ScoredSkill;
  readonly lang: Lang;
  /** The user's target band; practice draws from this plus the one below it. */
  readonly targetBand: TargetBand;
  readonly count: number;
  /** Defaults to `"practice"`. */
  readonly mode?: SelectionMode;
  /**
   * Sub-skills to weight as the weakest are, in practice mode (progress.md D124): the fixes
   * of the latest oral report. Absent or empty, the draw is exactly as it was before. A
   * sub-skill of another skill reaches no item, since the skill filter is first.
   */
  readonly boost?: readonly SubSkill[];
};

/** The bands practice draws from: the target band plus the one below it (§7.2). */
export const workingSet = (targetBand: TargetBand): readonly TargetBand[] => {
  const top = bandRank(targetBand);
  return TARGET_BANDS.filter((band) => bandRank(band) === top || bandRank(band) === top - 1);
};

type Weighted = { readonly item: Item; readonly weight: number };

/**
 * A weighted sample without replacement by the Efraimidis–Spirakis method: give
 * each item the key `random()^(1/weight)` and take the highest keys. This draws
 * an item with probability proportional to its weight, in one pass, with no
 * index arithmetic and no branch that a test cannot reach. A heavier weight
 * pushes the key toward 1, so at equal luck the weighted item wins.
 */
const sampleWeighted = (entries: readonly Weighted[], count: number, random: () => number): readonly Item[] =>
  entries
    .map((entry) => ({ item: entry.item, key: Math.pow(random(), 1 / entry.weight) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((entry) => entry.item);

/**
 * Reorder so that no two consecutive items share a sub-skill (§7.2): group the
 * items, largest group first, then deal into the even positions before the odd
 * ones. This is the standard arrangement that separates every group when the
 * largest is no more than half the items, and degrades gracefully — placing the
 * rest as far apart as possible — when one sub-skill unavoidably dominates.
 */
const spaceBySubSkill = (items: readonly Item[]): readonly Item[] => {
  const groups = new Map<SubSkill, Item[]>();
  for (const item of items) {
    const queue = groups.get(item.subSkill) ?? [];
    queue.push(item);
    groups.set(item.subSkill, queue);
  }

  const ordered = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .flatMap(([, queue]) => queue);

  const result: Item[] = new Array<Item>(ordered.length);
  let pos = 0;
  for (const item of ordered) {
    result[pos] = item;
    pos += 2;
    if (pos >= ordered.length) pos = 1;
  }
  return result;
};

export const selectItems = (
  criteria: SelectionCriteria,
  pool: readonly Item[],
  attempts: readonly Attempt[],
  random: () => number,
  now: string,
): readonly Item[] => {
  const cutoff = new Date(now).getTime() - RECENT_DAYS * DAY_MS;
  const recent = new Set<ItemId>(
    attempts.filter((a) => new Date(a.ts).getTime() >= cutoff).map((a) => a.itemId),
  );
  const eligible = (item: Item): boolean =>
    item.status === "published" &&
    item.lang === criteria.lang &&
    item.skill === criteria.skill &&
    !recent.has(item.id);

  if ((criteria.mode ?? "practice") === "diagnostic") {
    // Coverage, not targeting: every band, no sub-skill weighting.
    const entries = pool.filter(eligible).map((item) => ({ item, weight: 1 }));
    return spaceBySubSkill(sampleWeighted(entries, criteria.count, random));
  }

  const bands = workingSet(criteria.targetBand);
  const weakest = new Set<SubSkill>([...weakestSubSkills(criteria.skill, attempts, pool), ...(criteria.boost ?? [])]);
  const entries = pool
    .filter((item) => eligible(item) && bands.includes(item.targetBand))
    .map((item) => ({ item, weight: weakest.has(item.subSkill) ? WEAKEST_WEIGHT : 1 }));
  return spaceBySubSkill(sampleWeighted(entries, criteria.count, random));
};
