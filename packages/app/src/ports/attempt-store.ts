import type { Attempt, ItemId, Skill } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * Local, append-only persistence of answered items, one port per aggregate
 * (implementation-plan.md 3.3). Append-only and keyed by the attempt's ULID is
 * what makes attempts a conflict-free case during sync (architecture.md 9.4);
 * an implementation therefore treats a duplicate id as a no-op, which the
 * contract suite asserts.
 *
 * `append` resolves to whether the attempt was newly stored: `true` on a fresh
 * id, `false` when the id was already present and the call was the no-op above.
 * The record itself is idempotent either way; the boolean exists so a use case
 * can make its *non-idempotent* follow-on writes idempotent too — `answerItem`
 * uses it to avoid advancing an item's Leitner box a second time on a retry
 * (progress.md D44). Like `ScheduleStore.get` (D38), it is a signal a use case's
 * correctness needs and `Promise<void>` could not supply.
 */
export type AttemptStore = {
  append: (attempt: Attempt) => Promise<boolean>;
  recent: (skill: Skill, n: number) => Promise<readonly Attempt[]>;
  since: (t: ISO) => Promise<readonly Attempt[]>;
  forItem: (id: ItemId) => Promise<readonly Attempt[]>;
};
