import type { SpendPricing } from "@palier/app";
import { AI_FEATURES, type FeatureCall, type ModelPrice } from "@palier/domain";

import aiModels from "./ai-models.json";
import pricingJson from "./pricing.json";

/**
 * Pricing as data (architecture.md §8.6, progress.md D103), checked at the edge the way the
 * profile is: the file is structure-checked here, once, before the adapter prices a call or
 * the key screen shows a figure. A bad file fails the build's tests and the page load, never
 * a quiet zero on the meter.
 */

const isRate = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** The model each role uses: `ai-models.json` without its `note`. */
export const roleModels = (raw: Record<string, unknown>): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => entry[0] !== "note" && typeof entry[1] === "string"),
  );

const modelPrice = (id: string, raw: unknown): ModelPrice => {
  if (!isObject(raw) || !isRate(raw.inputPerMTok) || !isRate(raw.outputPerMTok)) {
    throw new Error(`pricing.json: the price of ${id} is not two rates per million tokens.`);
  }
  return { inputPerMTok: raw.inputPerMTok, outputPerMTok: raw.outputPerMTok };
};

const featureCall = (feature: string, raw: unknown): FeatureCall => {
  if (!isObject(raw) || typeof raw.role !== "string" || !isRate(raw.inputTokens) || !isRate(raw.outputTokens)) {
    throw new Error(`pricing.json: a call of ${feature} is not a role with two token counts.`);
  }
  return { role: raw.role, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
};

/** Read `pricing.json` against the role map, or throw naming what is wrong. */
export const parsePricing = (raw: unknown, models: Readonly<Record<string, string>>): SpendPricing => {
  if (!isObject(raw) || !isObject(raw.models) || !isObject(raw.features)) {
    throw new Error("pricing.json: expected `models` and `features` objects.");
  }
  const prices = Object.fromEntries(Object.entries(raw.models).map(([id, price]) => [id, modelPrice(id, price)]));
  const table = raw.features;
  const features = Object.fromEntries(
    AI_FEATURES.map((feature) => {
      const calls = table[feature];
      if (!Array.isArray(calls)) throw new Error(`pricing.json: ${feature} has no typical calls.`);
      return [feature, calls.map((call) => featureCall(feature, call))];
    }),
  ) as unknown as SpendPricing["features"];
  return { models, prices, features };
};

/** This build's pricing, parsed once. */
export const PRICING: SpendPricing = parsePricing(pricingJson, roleModels(aiModels));
