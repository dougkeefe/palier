import type { ISO, ScheduleEntry, ScheduleStore } from "@palier/app";
import type { ItemId } from "@palier/domain";

import type { PalierDb } from "./db.js";

/**
 * The Dexie-backed `ScheduleStore` (architecture.md 9.1). Keyed by `itemId`, so
 * `put` replaces rather than duplicates. `due` reads the `due` index below/at the
 * given instant, soonest first — and never returns a retired entry, for free:
 * `due` is null once an item retires and IndexedDB does not index a null key path,
 * so the entry drops out of the index while staying reachable through `get`. ISO 8601
 * `...Z` strings sort lexicographically as they do chronologically, so the string
 * comparison the index performs is the right one.
 */
export const dexieScheduleStore = (db: PalierDb): ScheduleStore => ({
  due: (now: ISO, limit: number) =>
    db.schedule.where("due").belowOrEqual(now).limit(limit).toArray(),
  get: async (id: ItemId) => (await db.schedule.get(id)) ?? null,
  put: async (entry: ScheduleEntry) => {
    await db.schedule.put(entry);
  },
});
