import type { ItemId, Skill } from "@palier/domain";

import type { ISO } from "./time.js";

/**
 * One item's place in the review schedule.
 *
 * **Deliberately minimal (progress.md deviation D19).** §3.3 names
 * `ScheduleEntry` but gives it no shape, and its full Leitner form — the box
 * number that indexes ADR 8's four intervals — is the `Scheduler`'s output and
 * belongs to the engine session that builds it. This carries only what the
 * `ScheduleStore` port itself needs: which item, when it is next due, and the
 * skill the review queue filters on. The box is added, not reshaped, when the
 * scheduler lands.
 */
export type ScheduleEntry = {
  readonly itemId: ItemId;
  readonly due: ISO;
  readonly skill: Skill;
};

/**
 * Local persistence of the review schedule (implementation-plan.md 3.3). Keyed
 * by item, so rescheduling replaces rather than duplicates; `due` returns the
 * soonest-due entries first, up to a limit.
 */
export type ScheduleStore = {
  due: (now: ISO, limit: number) => Promise<readonly ScheduleEntry[]>;
  put: (entry: ScheduleEntry) => Promise<void>;
};
