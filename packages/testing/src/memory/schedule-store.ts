import type { ISO, ScheduleEntry, ScheduleStore } from "@palier/app";
import type { ItemId } from "@palier/domain";

/** An entry that is still in the queue: `due` is non-null, so it can be ordered. */
type QueuedEntry = ScheduleEntry & { readonly due: ISO };

const isQueued = (entry: ScheduleEntry): entry is QueuedEntry => entry.due !== null;

/**
 * A retired entry carries `due: null` and is deliberately invisible to `due()`
 * while remaining reachable through `get()`. That is not this implementation's
 * choice: architecture.md 9.1 indexes the real store on `due`, and IndexedDB
 * will not index a record whose key path is null, so the Dexie adapter gets the
 * same exclusion structurally. The contract suite holds both to it.
 */
export const memoryScheduleStore = (): ScheduleStore => {
  const byItem = new Map<string, ScheduleEntry>();

  return {
    due: (now: ISO, limit: number) =>
      Promise.resolve(
        [...byItem.values()]
          .filter(isQueued)
          .filter((e) => Date.parse(e.due) <= Date.parse(now))
          .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
          .slice(0, limit),
      ),
    get: (id: ItemId) => Promise.resolve(byItem.get(id) ?? null),
    put: (entry) => {
      byItem.set(entry.itemId, entry);
      return Promise.resolve();
    },
  };
};
