import type { ModelPrice } from "./ai.js";

/**
 * What a call was billed for, in whichever units it reports (progress.md D117). A
 * `FeatureCall` is one, and so is a measured usage.
 */
export type BilledAmounts = {
  readonly inputTokens?: number | undefined;
  readonly outputTokens?: number | undefined;
  readonly minutes?: number | undefined;
  readonly characters?: number | undefined;
};

/**
 * The cost in USD of `amounts` at `price`, or `null` when the unit the model is
 * priced in was not measured: a figure that is quietly too low is worse than none
 * (D103). The one pricing rule, shared by the adapter that prices each call and the
 * engine that estimates a feature (D117).
 */
export const costOf = (price: ModelPrice, amounts: BilledAmounts): number | null => {
  if ("perMinute" in price) return amounts.minutes === undefined ? null : amounts.minutes * price.perMinute;
  if ("perMChars" in price) {
    return amounts.characters === undefined ? null : (amounts.characters / 1_000_000) * price.perMChars;
  }
  if (amounts.inputTokens === undefined || amounts.outputTokens === undefined) return null;
  return (amounts.inputTokens / 1_000_000) * price.inputPerMTok + (amounts.outputTokens / 1_000_000) * price.outputPerMTok;
};
