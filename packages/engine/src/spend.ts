import type { FeatureCall, ModelPrice } from "@palier/domain";

/**
 * The spend meter's arithmetic (PRD §8.10, architecture.md §8.6, progress.md D103).
 * Pure: the ledger's rows and "now" arrive as plain data (D32).
 *
 * - **The session** is everything since `sessionStart`, which the composition root
 *   takes when it builds a tab's container, the same lifetime D98 gives a tab-only key.
 * - **The week starts on Monday at 00:00 UTC, and the month on the 1st at 00:00 UTC.**
 *   UTC, so the meter buckets the way OpenAI's usage page does, which is what Gate G
 *   compares it with.
 * - **No upper bound.** A row stamped after `now` (a clock moved back) still counts,
 *   because the money was still spent.
 */

/** The share of the cap at which the meter warns: PRD §8.10's "a warning at 80 percent". */
export const CAP_WARNING_PERCENT = 80;

/** What the meter needs of a ledger row. */
export type SpendRow = { readonly ts: string; readonly costUsd: number | null };

export type SpendTotals = {
  readonly session: number;
  readonly week: number;
  readonly month: number;
  /** Rows this month with no price, so the month's total is a floor, not a figure. */
  readonly unpriced: number;
};

export type CapState = "none" | "under" | "near" | "over";

export type Preflight = {
  /** Null when a model the feature uses is unpriced, so no estimate can be honest. */
  readonly estimateUsd: number | null;
  readonly before: CapState;
  /** The cap state once the estimate is spent; `before` when there is no estimate. */
  readonly after: CapState;
};

const DAY_MS = 86_400_000;

const instant = (iso: string): Date => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new RangeError(`"${iso}" is not an instant.`);
  return date;
};

/** Monday 00:00 UTC of the week holding `now`. */
export const weekStart = (now: string): number => {
  const date = instant(now);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return midnight - ((date.getUTCDay() + 6) % 7) * DAY_MS;
};

/** The 1st of the month holding `now`, at 00:00 UTC. */
export const monthStart = (now: string): number => {
  const date = instant(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

/** The session, week and month totals over the ledger's rows. */
export const spendTotals = (
  rows: readonly SpendRow[],
  window: { readonly now: string; readonly sessionStart: string },
): SpendTotals => {
  const session = instant(window.sessionStart).getTime();
  const week = weekStart(window.now);
  const month = monthStart(window.now);
  const totals = { session: 0, week: 0, month: 0, unpriced: 0 };
  for (const row of rows) {
    const at = Date.parse(row.ts);
    const cost = row.costUsd ?? 0;
    if (at >= session) totals.session += cost;
    if (at >= week) totals.week += cost;
    if (at >= month) {
      totals.month += cost;
      if (row.costUsd === null) totals.unpriced += 1;
    }
  }
  return totals;
};

/**
 * A feature's typical cost: each call's tokens at its model's price. Null when a
 * role names no model, or the model has no price, rather than a figure that is
 * quietly too low.
 */
export const estimateFeatureCost = (
  calls: readonly FeatureCall[],
  models: Readonly<Record<string, string>>,
  prices: Readonly<Record<string, ModelPrice>>,
): number | null => {
  let total = 0;
  for (const call of calls) {
    const model = models[call.role];
    const price = model === undefined ? undefined : prices[model];
    if (price === undefined) return null;
    total +=
      (call.inputTokens / 1_000_000) * price.inputPerMTok +
      (call.outputTokens / 1_000_000) * price.outputPerMTok;
  }
  return total;
};

/** Whole micro-dollars, so the 80% and 100% boundaries are exact, not wherever a float lands. */
const micros = (usd: number): number => Math.round(usd * 1_000_000);

/** Where this month stands against the user's soft cap. */
export const capState = (monthUsd: number, capUsd: number | null): CapState => {
  if (capUsd === null) return "none";
  const spent = micros(monthUsd);
  const cap = micros(capUsd);
  if (spent >= cap) return "over";
  if (spent * 100 >= cap * CAP_WARNING_PERCENT) return "near";
  return "under";
};

/** The pre-flight answer a spending feature asks for before it spends (architecture.md §8.6). */
export const preflight = (input: {
  readonly estimateUsd: number | null;
  readonly monthUsd: number;
  readonly capUsd: number | null;
}): Preflight => {
  const before = capState(input.monthUsd, input.capUsd);
  const after =
    input.estimateUsd === null ? before : capState(input.monthUsd + input.estimateUsd, input.capUsd);
  return { estimateUsd: input.estimateUsd, before, after };
};
