import { readFileSync } from "node:fs";

import { AI_FEATURES } from "@palier/domain";
import { estimateFeatureCost } from "@palier/engine";
import { describe, expect, it } from "vitest";

import aiModels from "./ai-models.json";
import {
  PRICING,
  REALTIME_EAGERNESS,
  STUDIO_MAX_MINUTES,
  parsePricing,
  parseRealtimeEagerness,
  parseStudioMaxMinutes,
  roleModels,
} from "./pricing";

const factoryPricing = JSON.parse(
  readFileSync(new URL("../../../factory/config/pricing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const models = { draft: "m" };
const good = {
  models: { m: { inputPerMTok: 1, outputPerMTok: 2 } },
  features: { "writing-feedback": [{ role: "draft", inputTokens: 1, outputTokens: 2 }], "item-generation": [], "oral-practice": [], "oral-assessment": [], "oral-studio": [], "diagnostic-interpretation": [] },
};

const realtimeRates = { textInputPerMTok: 4, textOutputPerMTok: 24, audioInputPerMTok: 32, audioOutputPerMTok: 64, cachedInputPerMTok: 0.4 };
const realtimeCall = {
  role: "realtime",
  textInputTokens: 300,
  textOutputTokens: 60,
  audioInputTokens: 360,
  audioOutputTokens: 480,
  cachedInputTokens: 30_000,
};

describe("PRICING, this build's pricing.json", () => {
  it("prices a typical use of every feature: each role it names has a model, and each model a price", () => {
    for (const feature of AI_FEATURES) {
      expect(estimateFeatureCost(PRICING.features[feature], PRICING.models, PRICING.prices), feature).not.toBeNull();
    }
  });

  it("prices every model the app configures, so no call the app makes is unpriced", () => {
    for (const model of Object.values(roleModels(aiModels))) {
      expect(PRICING.prices[model], model).toBeDefined();
    }
  });

  it("caps a studio session at a positive number of minutes (D166)", () => {
    expect(STUDIO_MAX_MINUTES).toBeGreaterThan(0);
  });

  it("prices studio mode's realtime model, and never takes its voice for a model (D165)", () => {
    expect(PRICING.models.realtime).toBe(aiModels.realtime);
    expect(Object.values(PRICING.models)).not.toContain(aiModels.realtimeVoice);
  });

  it("holds the browser's model prices equal to the factory's, for every model both price", () => {
    const shared = Object.keys(PRICING.prices).filter((id) => id in factoryPricing);
    expect(shared.length).toBeGreaterThan(0);
    for (const id of shared) expect(PRICING.prices[id], id).toEqual(factoryPricing[id]);
  });
});

describe("roleModels", () => {
  it("takes every role and leaves out the note", () => {
    expect(roleModels({ note: "why", draft: "m-1", review: "m-2", broken: 3 })).toEqual({ draft: "m-1", review: "m-2" });
  });

  it("leaves out the examiner's voice, which is not a model (D117)", () => {
    expect(roleModels({ speech: "tts-1", voice: "sage" })).toEqual({ speech: "tts-1" });
  });

  it("leaves out studio mode's voice too (D165)", () => {
    expect(roleModels({ realtime: "rt-1", realtimeVoice: "marin" })).toEqual({ realtime: "rt-1" });
  });

  it("leaves out studio mode's turn detection eagerness, which is not a model either (D175)", () => {
    expect(roleModels({ realtime: "rt-1", realtimeEagerness: "low" })).toEqual({ realtime: "rt-1" });
  });
});

describe("parseRealtimeEagerness (D175)", () => {
  it("reads each of the Realtime API's four eagerness values", () => {
    for (const value of ["low", "medium", "high", "auto"]) expect(parseRealtimeEagerness(value)).toBe(value);
  });

  it("fails the build on any other value, or none", () => {
    expect(() => parseRealtimeEagerness("sluggish")).toThrow("realtimeEagerness");
    expect(() => parseRealtimeEagerness(undefined)).toThrow("realtimeEagerness");
  });

  it("gives this build a valid eagerness, never priced as a model", () => {
    expect(REALTIME_EAGERNESS).toBe(aiModels.realtimeEagerness);
    expect(Object.values(PRICING.models)).not.toContain(aiModels.realtimeEagerness);
  });
});

describe("parsePricing", () => {
  it("reads a well-formed file", () => {
    expect(parsePricing(good, models)).toEqual({
      models,
      prices: { m: { inputPerMTok: 1, outputPerMTok: 2 } },
      features: {
        "writing-feedback": [{ role: "draft", inputTokens: 1, outputTokens: 2 }],
        "item-generation": [],
        "oral-practice": [],
        "oral-assessment": [],
        "oral-studio": [],
        "diagnostic-interpretation": [],
      },
    });
  });

  it("reads a realtime model's five rates, and a call in realtime tokens (D167)", () => {
    const studio = {
      models: { ...good.models, rt: realtimeRates },
      features: { ...good.features, "oral-studio": [realtimeCall, { role: "transcribe", minutes: 0.6 }] },
    };
    const parsed = parsePricing(studio, models);
    expect(parsed.prices.rt).toEqual(realtimeRates);
    expect(parsed.features["oral-studio"]).toEqual([realtimeCall, { role: "transcribe", minutes: 0.6 }]);
  });

  it("reads audio priced by the minute and by the character, and calls in those units (D117)", () => {
    const audio = {
      models: { ...good.models, stt: { perMinute: 0.0045 }, tts: { perMChars: 15 } },
      features: { ...good.features, "oral-practice": [{ role: "transcribe", minutes: 0.6 }, { role: "speech", characters: 180 }] },
    };
    const parsed = parsePricing(audio, models);
    expect(parsed.prices).toEqual({ m: { inputPerMTok: 1, outputPerMTok: 2 }, stt: { perMinute: 0.0045 }, tts: { perMChars: 15 } });
    expect(parsed.features["oral-practice"]).toEqual([{ role: "transcribe", minutes: 0.6 }, { role: "speech", characters: 180 }]);
  });

  it.each([
    ["not an object", null, "expected `models` and `features`"],
    ["no features", { models: {} }, "expected `models` and `features`"],
    ["a price that is not two rates", { ...good, models: { m: { inputPerMTok: -1, outputPerMTok: 2 } } }, "the price of m"],
    ["a price that is not an object", { ...good, models: { m: 2 } }, "the price of m"],
    ["a negative rate per minute", { ...good, models: { m: { perMinute: -1 } } }, "the price of m"],
    ["a price in two units at once", { ...good, models: { m: { perMinute: 1, perMChars: 1 } } }, "the price of m"],
    ["a realtime price missing a rate", { ...good, models: { m: { ...realtimeRates, cachedInputPerMTok: undefined } } }, "the price of m"],
    ["a realtime price with a negative rate", { ...good, models: { m: { ...realtimeRates, audioOutputPerMTok: -1 } } }, "the price of m"],
    [
      "a realtime call missing a unit",
      { ...good, features: { ...good.features, "oral-studio": [{ ...realtimeCall, cachedInputTokens: undefined }] } },
      "a call of oral-studio",
    ],
    [
      "a call in no unit",
      { ...good, features: { ...good.features, "oral-practice": [{ role: "speech", seconds: 3 }] } },
      "a call of oral-practice",
    ],
    ["a feature missing", { ...good, features: { "writing-feedback": [] } }, "item-generation has no typical calls"],
    [
      "a call with no role",
      { ...good, features: { ...good.features, "item-generation": [{ inputTokens: 1, outputTokens: 1 }] } },
      "a call of item-generation",
    ],
    [
      "a call that is not an object",
      { ...good, features: { ...good.features, "item-generation": ["draft"] } },
      "a call of item-generation",
    ],
  ])("refuses %s, naming what is wrong", (_, raw, message) => {
    expect(() => parsePricing(raw, models)).toThrow(message);
  });
});

describe("parseStudioMaxMinutes", () => {
  it("reads the cap", () => {
    expect(parseStudioMaxMinutes({ studioMaxMinutes: 25 })).toBe(25);
  });

  it.each([
    ["not an object", null],
    ["no cap", {}],
    ["a cap of zero", { studioMaxMinutes: 0 }],
    ["a negative cap", { studioMaxMinutes: -5 }],
    ["a cap that is not a number", { studioMaxMinutes: "25" }],
  ])("refuses %s", (_, raw) => {
    expect(() => parseStudioMaxMinutes(raw)).toThrow("studioMaxMinutes");
  });
});
