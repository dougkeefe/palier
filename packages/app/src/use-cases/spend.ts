import type { AiFeature, FeatureCall, ModelPrice } from "@palier/domain";
import { AI_FEATURES } from "@palier/domain";
import type { CapState, Preflight, SpendTotals } from "@palier/engine";
import { capState, estimateFeatureCost, monthStart, preflight, spendTotals, weekStart } from "@palier/engine";

import type { Clock, CostLedger, ISO, SettingsStore } from "../ports/index.js";

/**
 * The spend meter, the soft cap and the pre-flight estimate (product-requirements.md
 * §8.10, architecture.md §8.6, progress.md D101–D104). The arithmetic is the engine's;
 * these read the ledger and the cap, and hand it plain data.
 */

/**
 * Pricing as data (D103), from the app's `pricing.json` and model configuration: the model
 * each role uses, each model's price, and the calls a typical use of each feature makes.
 */
export type SpendPricing = {
  readonly models: Readonly<Record<string, string>>;
  readonly prices: Readonly<Record<string, ModelPrice>>;
  readonly features: Readonly<Record<AiFeature, readonly FeatureCall[]>>;
};

export type SpendDeps = {
  readonly ledger: CostLedger;
  readonly settings: SettingsStore;
  readonly clock: Clock;
  /** When this tab's container was built: the meter's "this session" (D103). */
  readonly sessionStart: ISO;
  readonly pricing: SpendPricing;
};

/**
 * The setting that holds the soft cap, in USD a month. **It syncs, and the ledger does not**
 * (D104): the cap is a preference, like the daily goal, and each device compares it with
 * its own spending.
 */
export const SPEND_CAP_KEY = "spendCap";

/** A cap that is not a positive, finite number of dollars. */
export class InvalidSpendCapError extends Error {
  constructor(cap: number) {
    super(`A monthly cap must be more than zero dollars, not ${cap}.`);
    this.name = "InvalidSpendCapError";
  }
}

const isCap = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** The soft monthly cap in USD, or `null` when none is set or the stored value is not one. */
export const spendCap = async (deps: Pick<SpendDeps, "settings">): Promise<number | null> => {
  const value = await deps.settings.get<unknown>(SPEND_CAP_KEY);
  return isCap(value) ? value : null;
};

/** Set the soft monthly cap, or remove it with `null`. */
export const setSpendCap = async (cap: number | null, deps: Pick<SpendDeps, "settings">): Promise<void> => {
  if (cap !== null && !isCap(cap)) throw new InvalidSpendCapError(cap);
  await deps.settings.set<number | null>(SPEND_CAP_KEY, cap);
};

export type SpendSummary = {
  readonly totals: SpendTotals;
  readonly capUsd: number | null;
  readonly cap: CapState;
};

/** Every row the meter can need: back to the earliest of its three windows' starts. */
const meterRows = (deps: Pick<SpendDeps, "ledger" | "clock" | "sessionStart">, now: ISO) => {
  const from = Math.min(weekStart(now), monthStart(now), Date.parse(deps.sessionStart));
  return deps.ledger.since(new Date(from).toISOString());
};

/** The meter: this session, this week and this month, and where the month stands against the cap. */
export const spendSummary = async (
  deps: Pick<SpendDeps, "ledger" | "settings" | "clock" | "sessionStart">,
): Promise<SpendSummary> => {
  const now = deps.clock.now();
  const [rows, capUsd] = await Promise.all([meterRows(deps, now), spendCap(deps)]);
  const totals = spendTotals(rows, { now, sessionStart: deps.sessionStart });
  return { totals, capUsd, cap: capState(totals.month, capUsd) };
};

export type FeatureCost = {
  readonly feature: AiFeature;
  /** A typical use's cost in USD, or `null` when a model it uses is unpriced. */
  readonly estimateUsd: number | null;
};

/** The per-feature cost table (§8.10), in `AI_FEATURES` order. */
export const featureCosts = (deps: Pick<SpendDeps, "pricing">): readonly FeatureCost[] =>
  AI_FEATURES.map((feature) => ({
    feature,
    estimateUsd: estimateFeatureCost(deps.pricing.features[feature], deps.pricing.models, deps.pricing.prices),
  }));

/**
 * What a spending feature asks before it spends (architecture.md §8.6): a typical use's
 * cost, and where the month would stand against the cap once it is spent. The caller
 * warns when `after` is `"near"` or `"over"`; it never blocks, because the cap is soft.
 */
export const preflightSpend = async (feature: AiFeature, deps: SpendDeps): Promise<Preflight> => {
  const { totals, capUsd } = await spendSummary(deps);
  const estimateUsd = estimateFeatureCost(
    deps.pricing.features[feature],
    deps.pricing.models,
    deps.pricing.prices,
  );
  return preflight({ estimateUsd, monthUsd: totals.month, capUsd });
};
