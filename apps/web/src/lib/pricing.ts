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

/** The keys of `ai-models.json` that are not a role's model: its `note`, and the examiner's `voice` (D117). */
const NOT_ROLES: ReadonlySet<string> = new Set(["note", "voice"]);

/** The model each role uses: `ai-models.json` without its `note` and `voice`. */
export const roleModels = (raw: Record<string, unknown>): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => !NOT_ROLES.has(entry[0]) && typeof entry[1] === "string"),
  );

/**
 * One model's price, in exactly one of the units OpenAI bills by (progress.md D117): two
 * rates per million tokens, a rate per minute of audio, or a rate per million characters.
 */
const modelPrice = (id: string, raw: unknown): ModelPrice => {
  if (isObject(raw) && Object.keys(raw).length === 1 && isRate(raw.perMinute)) return { perMinute: raw.perMinute };
  if (isObject(raw) && Object.keys(raw).length === 1 && isRate(raw.perMChars)) return { perMChars: raw.perMChars };
  if (!isObject(raw) || !isRate(raw.inputPerMTok) || !isRate(raw.outputPerMTok)) {
    throw new Error(`pricing.json: the price of ${id} is not two rates per million tokens, a rate per minute or a rate per million characters.`);
  }
  return { inputPerMTok: raw.inputPerMTok, outputPerMTok: raw.outputPerMTok };
};

/** One typical call, in one of the same three units (D117). */
const featureCall = (feature: string, raw: unknown): FeatureCall => {
  if (isObject(raw) && typeof raw.role === "string") {
    if (isRate(raw.inputTokens) && isRate(raw.outputTokens)) {
      return { role: raw.role, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
    }
    if (isRate(raw.minutes)) return { role: raw.role, minutes: raw.minutes };
    if (isRate(raw.characters)) return { role: raw.role, characters: raw.characters };
  }
  throw new Error(`pricing.json: a call of ${feature} is not a role with two token counts, minutes or characters.`);
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

/** The examiner's voice for speech (D117), from `ai-models.json`. */
export const EXAMINER_VOICE: string = aiModels.voice;

/** This build's pricing, parsed once. */
export const PRICING: SpendPricing = parsePricing(pricingJson, roleModels(aiModels));
