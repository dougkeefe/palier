import type { Item } from "@palier/domain";

import type { ISO, ItemRepository, ScheduleStore } from "../ports/index.js";

export type DueItemsDeps = {
  readonly schedule: Pick<ScheduleStore, "due">;
  readonly items: Pick<ItemRepository, "byIds">;
};

/**
 * The items due for review that the bank still serves, soonest-due first, at most `limit`
 * (progress.md D241). An entry whose item is retired (D205) or has left the bank is passed
 * over, never shown as a gap. It stays scheduled, and returns if the item does.
 *
 * Such an entry is never answered, so it stays due, at the head of the schedule, for good.
 * One `due(now, limit)` read filtered afterwards would let enough of them hide every live
 * item behind them. So this reads further down the schedule, by the slots the dead entries
 * took, until `limit` items are live or the schedule has no more. It writes nothing.
 */
export const dueLiveItems = async (
  deps: DueItemsDeps,
  now: ISO,
  limit: number,
): Promise<readonly Item[]> => {
  if (limit <= 0) return [];
  let asked = limit;
  for (;;) {
    const due = await deps.schedule.due(now, asked);
    const resolved = await deps.items.byIds(due.map((entry) => entry.itemId));
    const live = resolved.filter((item) => item.status !== "retired");
    if (live.length >= limit || due.length < asked) return live.slice(0, limit);
    // Here fewer than `limit` of at least `limit` entries are live, so this always grows.
    asked += due.length - live.length;
  }
};
