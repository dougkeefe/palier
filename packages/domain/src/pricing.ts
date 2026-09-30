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
  readonly textInputTokens?: number | undefined;
  readonly textOutputTokens?: number | undefined;
  readonly audioInputTokens?: number | undefined;
  readonly audioOutputTokens?: number | undefined;
  readonly cachedInputTokens?: number | undefined;
};

const REALTIME_UNITS = [
  ["textInputTokens", "textInputPerMTok"],
  ["textOutputTokens", "textOutputPerMTok"],
  ["audioInputTokens", "audioInputPerMTok"],
  ["audioOutputTokens", "audioOutputPerMTok"],
  ["cachedInputTokens", "cachedInputPerMTok"],
] as const;

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
  if ("audioInputPerMTok" in price) {
    let total = 0;
    for (const [unit, rate] of REALTIME_UNITS) {
      const count = amounts[unit];
      if (count === undefined) return null;
      total += (count / 1_000_000) * price[rate];
    }
    return total;
  }
  if (amounts.inputTokens === undefined || amounts.outputTokens === undefined) return null;
  return (amounts.inputTokens / 1_000_000) * price.inputPerMTok + (amounts.outputTokens / 1_000_000) * price.outputPerMTok;
};
