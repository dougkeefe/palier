import type { Item } from "@palier/domain";

import type { Clock, ItemRepository, ScheduleStore } from "../ports/index.js";

/**
 * The review queue (product-requirements.md §8.8): every item due now, across both
 * skills, soonest-due first, as one stack. Pure orchestration: the schedule says what
 * is due, the bank resolves it (§6.5: wrong, wavering and slow answers enter it).
 *
 * An entry whose item has left the bank is dropped rather than shown as a gap. It
 * stays scheduled, and returns if the item does.
 */
export type ReviewQueueRequest = {
  /** The most items one review set holds. */
  readonly limit: number;
};

export type ReviewQueueDeps = {
  readonly clock: Clock;
  readonly schedule: ScheduleStore;
  readonly items: ItemRepository;
};

export type ReviewQueueResult = {
  readonly items: readonly Item[];
};

export const reviewQueue = async (
  request: ReviewQueueRequest,
  deps: ReviewQueueDeps,
): Promise<ReviewQueueResult> => {
  if (request.limit <= 0) return { items: [] };
  const due = await deps.schedule.due(deps.clock.now(), request.limit);
  const items = await deps.items.byIds(due.map((entry) => entry.itemId));
  return { items };
};
