import type { SpendPricing } from "@palier/app";
import { AI_FEATURES, type FeatureCall, type ModelPrice, type RealtimePrice, type RealtimeTokens } from "@palier/domain";

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

/**
 * The keys of `ai-models.json` that are not a role's model: its `note`, the examiner's `voice` (D117), and
 * studio mode's `realtimeVoice` (D165).
 */
const NOT_ROLES: ReadonlySet<string> = new Set(["note", "voice", "realtimeVoice"]);

/** The model each role uses: `ai-models.json` without its `note` and voices. */
export const roleModels = (raw: Record<string, unknown>): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => !NOT_ROLES.has(entry[0]) && typeof entry[1] === "string"),
  );

const REALTIME_RATES = [
  "textInputPerMTok",
  "textOutputPerMTok",
  "audioInputPerMTok",
  "audioOutputPerMTok",
  "cachedInputPerMTok",
] as const satisfies readonly (keyof RealtimePrice)[];

const REALTIME_TOKENS = [
  "textInputTokens",
  "textOutputTokens",
  "audioInputTokens",
  "audioOutputTokens",
  "cachedInputTokens",
] as const satisfies readonly (keyof RealtimeTokens)[];

/** Exactly `keys`, each a rate, picked into a new object; `null` otherwise. */
const exactly = <K extends string>(raw: Record<string, unknown>, keys: readonly K[]): Record<K, number> | null =>
  Object.keys(raw).length === keys.length && keys.every((key) => isRate(raw[key]))
    ? (Object.fromEntries(keys.map((key) => [key, raw[key]])) as Record<K, number>)
    : null;

/**
 * One model's price, in exactly one of the units OpenAI bills by (progress.md D117): two
 * rates per million tokens, a rate per minute of audio, a rate per million characters, or a
 * realtime model's five rates (D167).
 */
const modelPrice = (id: string, raw: unknown): ModelPrice => {
  if (isObject(raw) && Object.keys(raw).length === 1 && isRate(raw.perMinute)) return { perMinute: raw.perMinute };
  if (isObject(raw) && Object.keys(raw).length === 1 && isRate(raw.perMChars)) return { perMChars: raw.perMChars };
  const realtime = isObject(raw) ? exactly(raw, REALTIME_RATES) : null;
  if (realtime !== null) return realtime;
  if (!isObject(raw) || !isRate(raw.inputPerMTok) || !isRate(raw.outputPerMTok)) {
    throw new Error(
      `pricing.json: the price of ${id} is not two rates per million tokens, a rate per minute, a rate per million characters or five realtime rates.`,
    );
  }
  return { inputPerMTok: raw.inputPerMTok, outputPerMTok: raw.outputPerMTok };
};

/** One typical call, in one of the same four units (D117, D167). */
const featureCall = (feature: string, raw: unknown): FeatureCall => {
  if (isObject(raw) && typeof raw.role === "string") {
    const { role, ...amounts } = raw;
    const realtime = exactly(amounts, REALTIME_TOKENS);
    if (realtime !== null) return { role, ...realtime };
    if (isRate(raw.inputTokens) && isRate(raw.outputTokens)) {
      return { role: raw.role, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
    }
    if (isRate(raw.minutes)) return { role: raw.role, minutes: raw.minutes };
    if (isRate(raw.characters)) return { role: raw.role, characters: raw.characters };
  }
  throw new Error(`pricing.json: a call of ${feature} is not a role with two token counts, minutes, characters or realtime tokens.`);
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

/**
 * Studio mode's hard session cap in minutes (architecture.md §8.6, D165, D166): a spend guard beside
 * the realtime price, so it lives in `pricing.json`, not the profile. A positive number, or the build fails.
 */
export const parseStudioMaxMinutes = (raw: unknown): number => {
  const minutes = isObject(raw) ? raw.studioMaxMinutes : undefined;
  if (!isRate(minutes) || minutes <= 0) throw new Error("pricing.json: `studioMaxMinutes` is not a positive number of minutes.");
  return minutes;
};

/** The examiner's voice for speech (D117), from `ai-models.json`. */
export const EXAMINER_VOICE: string = aiModels.voice;

/** Studio mode's voice (D165), from `ai-models.json`. Gate N may change it. */
export const REALTIME_VOICE: string = aiModels.realtimeVoice;

/** This build's pricing, parsed once. */
export const PRICING: SpendPricing = parsePricing(pricingJson, roleModels(aiModels));

/** This build's studio session cap, in minutes. */
export const STUDIO_MAX_MINUTES: number = parseStudioMaxMinutes(pricingJson);
