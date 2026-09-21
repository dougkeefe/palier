import type { ItemId, Skill } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One item's place in the review schedule (implementation-plan.md 3.3).
 *
 * `box` is the Leitner box the item currently sits in, 1 to the retirement box,
 * indexing the profile's four intervals (ADR 8, architecture.md 7.3). It is the
 * field deviation D19 held back until something could write it: the box is the
 * engine `Scheduler`'s output, but `@palier/engine` may not import this package
 * (D32), so it took the first use case that *persists* a review to add it.
 *
 * `due` is null once the item retires from the queue, mirroring the engine's
 * `Review` exactly so the map from one to the other is a field copy. A retired
 * entry is kept rather than deleted: it carries the box, so an item answered
 * wrong long after retirement resumes with its history rather than from nothing.
 *
 * Storing the box is **not** the derived state ADR 16 forbids. The schedule is a
 * persisted projection implementation-plan.md 3.3 and architecture.md 9.1 already
 * sanction (`schedule: 'itemId, due, skill'`); ADR 16's own target is the band
 * estimate, and its *revisit when* — "persisting a derived value as a cache,
 * keyed by a hash of its inputs and never synced" — describes something else.
 * The alternative, replaying the Leitner rule over `AttemptStore.forItem`, was
 * considered and rejected: the fold needs the `slow` judgement for every past
 * attempt, so the box would silently re-derive (and retired items un-retire) the
 * day that judgement is tuned. See progress.md D38.
 */
export type ScheduleEntry = {
  readonly itemId: ItemId;
  /** When the item is next due, or null once it has retired from the queue. */
  readonly due: ISO | null;
  readonly skill: Skill;
  /** The Leitner box, 1 to the retirement box the profile's intervals imply. */
  readonly box: number;
};

/**
 * Local persistence of the review schedule (implementation-plan.md 3.3). Keyed
 * by item, so rescheduling replaces rather than duplicates; `due` returns the
 * soonest-due entries first, up to a limit, and never returns a retired entry.
 *
 * `get` is the one addition to the 3.3 signature: `scheduleReview` needs the
 * item's *current* box, and `due`/`put` cannot supply it. It is also the only
 * way to reach a retired entry, which `due` deliberately hides — and, since
 * architecture.md 9.1 indexes this store on `due`, IndexedDB will not index a
 * null key path, so the Dexie adapter gets that exclusion for free rather than
 * by filtering. The contract suite asserts both halves.
 */
export type ScheduleStore = {
  due: (now: ISO, limit: number) => Promise<readonly ScheduleEntry[]>;
  get: (id: ItemId) => Promise<ScheduleEntry | null>;
  put: (entry: ScheduleEntry) => Promise<void>;
};
