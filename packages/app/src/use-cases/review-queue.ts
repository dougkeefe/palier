import type { Item } from "@palier/domain";

import type { Clock, ItemRepository, ScheduleStore } from "../ports/index.js";
import { dueLiveItems } from "./due-items.js";

/**
 * The review queue (product-requirements.md §8.8): every item due now, across both
 * skills, soonest-due first, as one stack. Pure orchestration: the schedule says what
 * is due, the bank resolves it (§6.5: wrong, wavering and slow answers enter it).
 *
 * An entry whose item is retired or has left the bank is passed over rather than shown
 * as a gap, and the queue reads past it to fill the set (`dueLiveItems`, progress.md D241).
 * It stays scheduled, and returns if the item does.
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
  return { items: await dueLiveItems(deps, deps.clock.now(), request.limit) };
};
