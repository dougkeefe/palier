import type { ItemId } from "./ids.js";
import type { ItemStatisticsRules } from "./profile/exam-profile.js";

/**
 * Opt-in anonymous item telemetry (PRD 15, architecture.md 9.2). A DTO, not a
 * content artefact, so it is absent from `CONTENT_SCHEMAS` (ADR 20).
 *
 * **It carries no identity, by construction.** No account id, no device id, no
 * run id and no timestamp: nothing that links one event to another, or to a
 * person. The schema is strict, so an extra field is rejected at the edge rather
 * than stored.
 */

/**
 * How the rest of the exam went, in quintiles: the run's accuracy on its
 * *other* scored items, 0 (under 20%) to 4 (80% or more). It is what makes a
 * point-biserial computable without an ability estimate (ADR 7).
 */
export const REST_BUCKETS = [0, 1, 2, 3, 4] as const;
export type RestBucket = (typeof REST_BUCKETS)[number];

/**
 * The longest response time the wire accepts, three hours. A sanity bound, not
 * an exam rule: the longest variant with extra time is well inside it, and a
 * client clamps to it rather than send a clock that jumped.
 */
export const TELEMETRY_MAX_RESPONSE_MS = 10_800_000;

export type TelemetryEvent = {
  readonly itemId: ItemId;
  readonly correct: boolean;
  /** Milliseconds to the answer, a whole number. */
  readonly responseMs: number;
  readonly bankVersion: number;
  readonly restBucket: RestBucket;
};

/** Why a verdict retires an item. */
export const RETIREMENT_REASONS = ["too-easy", "too-hard", "low-discrimination"] as const;
export type RetirementReason = (typeof RETIREMENT_REASONS)[number];

/**
 * The statistics job's judgement of one item (architecture.md 7.6). An item
 * retires when `reasons` is not empty, and a reason is only ever given by a
 * check whose minimum response count was met.
 */
export type ItemVerdict = {
  readonly itemId: ItemId;
  readonly responses: number;
  readonly proportionCorrect: number;
  /** Null when either variable has no variance, so no correlation exists. */
  readonly pointBiserial: number | null;
  /** Which checks had enough responses to be applied. */
  readonly trusted: { readonly difficulty: boolean; readonly discrimination: boolean };
  readonly reasons: readonly RetirementReason[];
};

/**
 * What the monthly job writes to `content/factory/item-statistics.json`, and
 * what the factory reads when it next carries a bank forward.
 */
export type ItemStatisticsReport = {
  readonly generatedAt: string;
  /** The bank version the verdicts were judged against. */
  readonly bankVersion: number;
  /** Events read, including any for items the bank no longer holds. */
  readonly events: number;
  readonly rules: ItemStatisticsRules;
  /** One per item with events, in item-id order. */
  readonly verdicts: readonly ItemVerdict[];
};
