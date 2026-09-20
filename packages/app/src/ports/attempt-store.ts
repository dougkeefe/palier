import type { Attempt, ItemId, Skill } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * Local, append-only persistence of answered items, one port per aggregate
 * (implementation-plan.md 3.3). Append-only and keyed by the attempt's ULID is
 * what makes attempts a conflict-free case during sync (architecture.md 9.4);
 * an implementation therefore treats a duplicate id as a no-op, which the
 * contract suite asserts.
 */
export type AttemptStore = {
  append: (attempt: Attempt) => Promise<void>;
  recent: (skill: Skill, n: number) => Promise<readonly Attempt[]>;
  since: (t: ISO) => Promise<readonly Attempt[]>;
  forItem: (id: ItemId) => Promise<readonly Attempt[]>;
};
