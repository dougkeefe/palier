import type { Attempt, AttemptId, AttemptMode, ExamProfile, ItemId, ItemResponse, SessionId } from "@palier/domain";
import { itemTypeDefinition } from "@palier/domain";
import { type Review, retirementBox, scheduleReview } from "@palier/engine";

import type {
  AttemptStore,
  Clock,
  ItemRepository,
  ScheduleStore,
} from "../ports/index.js";

/**
 * Record one answer (implementation-plan.md 3.2, `AnswerItem`): score it through
 * the item type registry, append the attempt, and move the item through its
 * Leitner box (architecture.md 7.3). Pure orchestration — the scoring rule lives
 * in `@palier/domain`'s registry and the Leitner rule in `@palier/engine`; this
 * reads the ports, calls them in order, and writes the results back.
 *
 * The D32 bridge again: `Clock` is a port here, `scheduleReview` takes a plain
 * `now: string`, so the use case reads `clock.now()` and hands the value down.
 *
 * Three decisions this file carries, all recorded in progress.md:
 *
 * - **The `attemptId` arrives in the request** (D39). Minting a ULID needs
 *   randomness, and `@palier/domain`'s `ids.ts` says in terms that "the adapters
 *   mint; domain only names". The `Random` port is emphatically *not* the source:
 *   it is a seeded mulberry32 wired in production (3.5), so two devices minting
 *   from it would share an id stream — and an `AttemptStore` treats a duplicate
 *   id as a silent no-op, which would make that attempt loss rather than an
 *   error. An `IdGenerator` port over Web Crypto closes this, with the Phase 2
 *   drill route as the consumer that drives its shape. A caller-supplied id also
 *   makes a retried answer idempotent.
 * - **The `slow` judgement arrives in the request** (D40), exactly as
 *   `scheduler.ts` specifies: "the timing-to-slow threshold is a product tuning
 *   decision the caller owns, so it arrives as a boolean rather than a duration".
 *   No threshold is invented here. `msToConfirm` would be the wrong basis for one
 *   anyway — on a `comprehension` item it includes reading the passage.
 * - **Not every answer enters the queue** (D41). product-requirements.md 6.5:
 *   "Every item answered incorrectly, and every item answered correctly but
 *   slowly or with low confidence, enters a spaced repetition queue." So a
 *   correct, fast, unwavering answer to an item that is *not already scheduled*
 *   writes nothing. Once an item is in the schedule, every answer reschedules it
 *   — that is the Leitner rule, and it is what moves an item up a box.
 */

export type AnswerItemRequest = {
  /**
   * Minted by the caller (D39). Supplying the same id twice is a no-op at the
   * `AttemptStore`, which is what makes a retried answer safe.
   */
  readonly attemptId: AttemptId;
  readonly itemId: ItemId;
  /** An `OptionId` while every item type is multiple choice (D28). */
  readonly response: ItemResponse;
  readonly sessionId: SessionId;
  readonly mode: AttemptMode;
  readonly msToFirstSelect: number;
  readonly msToConfirm: number;
  /** The user changed their answer before confirming: correct-but-shaky. */
  readonly changedAnswer: boolean;
  /** Answered correctly but slowly. The caller owns the threshold (D40). */
  readonly slow: boolean;
};

export type AnswerItemDeps = {
  readonly clock: Clock;
  readonly items: ItemRepository;
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  /**
   * The Leitner intervals live in the profile, not in code (ADR 8, ADR 9), so
   * `scheduleReview` needs it. A profile is configuration the composition root
   * owns rather than a per-call study parameter, so it is a dep and not part of
   * the request — the line D36 drew for `planDailySession`'s inputs (D42).
   */
  readonly profile: ExamProfile;
};

export type AnswerItemResult = {
  readonly attempt: Attempt;
  /**
   * The review the answer produced, or null when the item did not enter the
   * queue — a correct, fast, unwavering answer to an unscheduled item (D41).
   */
  readonly review: Review | null;
};

/** The item id did not resolve in the bank, so there is nothing to score. */
export class UnknownItemError extends Error {
  constructor(readonly itemId: ItemId) {
    super(`No item with id ${itemId} is in the bank, so the answer cannot be scored.`);
    this.name = "UnknownItemError";
  }
}

export const answerItem = async (
  request: AnswerItemRequest,
  deps: AnswerItemDeps,
): Promise<AnswerItemResult> => {
  const now = deps.clock.now();

  const [item] = await deps.items.byIds([request.itemId]);
  if (item === undefined) throw new UnknownItemError(request.itemId);

  const { correct } = itemTypeDefinition(item.type).score(item, request.response);

  const attempt: Attempt = {
    id: request.attemptId,
    itemId: item.id,
    bankVersion: await deps.items.bankVersion(),
    // The item is the authority on its own skill; the request does not say.
    skill: item.skill,
    sessionId: request.sessionId,
    chosen: request.response,
    correct,
    msToFirstSelect: request.msToFirstSelect,
    msToConfirm: request.msToConfirm,
    changedAnswer: request.changedAnswer,
    mode: request.mode,
    ts: now,
  };

  // Append first: the attempt is the append-only, conflict-free record
  // (architecture.md 9.4). If the schedule write then fails, the evidence
  // survives and the box is recoverable; the other order loses the evidence.
  await deps.attempts.append(attempt);

  const existing = await deps.schedule.get(request.itemId);
  const shaky = !correct || request.changedAnswer || request.slow;
  if (existing === null && !shaky) return { attempt, review: null };

  const review = scheduleReview(
    deps.profile,
    currentBox(existing?.box, deps.profile),
    { correct, changedAnswer: request.changedAnswer, slow: request.slow },
    now,
  );

  await deps.schedule.put({
    itemId: item.id,
    due: review.due,
    skill: item.skill,
    box: review.box,
  });

  return { attempt, review };
};

/**
 * An unseen item starts in box 1. A stored box is clamped to the profile's
 * retirement box because the interval list is profile data and editable in a
 * content pull request (ADR 8): shortening it would otherwise make
 * `scheduleReview` throw a `RangeError` on every item already past the new top.
 */
const currentBox = (stored: number | undefined, profile: ExamProfile): number =>
  stored === undefined ? 1 : Math.min(stored, retirementBox(profile));
