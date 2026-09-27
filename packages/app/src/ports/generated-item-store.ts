import type { Item, ItemId, ScoredSkill } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One set of items generated in the browser on the user's key (architecture.md
 * §8.3, progress.md D110): the drafts that passed the review gate, in the order
 * they were drafted.
 *
 * Like `WritingSubmission`, this is a persisted aggregate owned by its store and
 * not a `@palier/domain` type: the engine never consumes it.
 */
export type GeneratedSet = {
  readonly id: string;
  readonly skill: ScoredSkill;
  readonly createdAt: ISO;
  readonly items: readonly Item[];
};

/**
 * Local persistence of runtime-generated items (progress.md D110), a port §3.3 did
 * not name. **Device-local: never synced and never exported, under any setting**
 * (architecture.md §8.3, §9.4), like `WritingStore`: an item generated on one
 * device was paid for there and is kept there. No sync collector takes it and
 * `exportData` does not; `wipeData` and `deleteEverywhere` clear it.
 *
 * Generated items never enter the practice trend: no `Attempt` is ever written for
 * one (`scoreGeneratedAnswer`), so they cannot reach `practiceTrend`'s input.
 *
 * - `putSet` keeps every item of the set; a set with no items is not kept.
 * - `latestSet` is the newest set for a skill by `createdAt` (ties by id), its
 *   items in the order they were put, or null when there is none.
 * - `item` finds one item of any kept set.
 */
export type GeneratedItemStore = {
  putSet: (set: GeneratedSet) => Promise<void>;
  latestSet: (skill: ScoredSkill) => Promise<GeneratedSet | null>;
  item: (id: ItemId) => Promise<Item | null>;
  clear: () => Promise<void>;
};
