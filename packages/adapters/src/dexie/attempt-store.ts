import type { AttemptStore, ISO } from "@palier/app";
import type { Attempt, ItemId, Skill } from "@palier/domain";

import type { PalierDb } from "./db.js";

/**
 * The Dexie-backed `AttemptStore` (architecture.md 9.1). Append-only, keyed by the
 * attempt's ULID, so a duplicate id is the silent no-op sync depends on (9.4): the
 * store uses `add`, and a `ConstraintError` on an existing key is caught and reported
 * as `false` (not newly stored) rather than thrown — matched by the error's `name`
 * (`"ConstraintError"`), which Dexie preserves from the underlying IndexedDB
 * `DOMException`, rather than by a class the ESM build does not reliably export — the
 * signal `answerItem` uses to
 * keep its Leitner reschedule idempotent on a retry (progress.md D44).
 *
 * `recent` and `since` lean on the declared indexes; both return in ascending id
 * (creation) order, which is insertion order for monotonic ULIDs — the same order the
 * in-memory store returns from its array, and what the contract suite asserts.
 */
export const dexieAttemptStore = (db: PalierDb): AttemptStore => ({
  append: async (attempt: Attempt) => {
    try {
      await db.attempts.add(attempt);
      return true;
    } catch (error) {
      // A repeated ULID is the append-only no-op, not a failure. Any other error
      // (a genuine write fault) still propagates.
      if (error instanceof Error && error.name === "ConstraintError") return false;
      throw error;
    }
  },
  recent: async (skill: Skill, n: number) => {
    if (n <= 0) return [];
    const forSkill = await db.attempts.where("skill").equals(skill).sortBy("id");
    return forSkill.slice(-n);
  },
  since: (t: ISO) => db.attempts.where("ts").aboveOrEqual(t).toArray(),
  forItem: (id: ItemId) => db.attempts.where("itemId").equals(id).toArray(),
  all: () => db.attempts.toArray(),
  clear: () => db.attempts.clear(),
});
