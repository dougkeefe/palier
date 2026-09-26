import { readFileSync } from "node:fs";

import { AI_FEATURES } from "@palier/domain";
import { estimateFeatureCost } from "@palier/engine";
import { describe, expect, it } from "vitest";

import aiModels from "./ai-models.json";
import { PRICING, parsePricing, roleModels } from "./pricing";

const factoryPricing = JSON.parse(
  readFileSync(new URL("../../../factory/config/pricing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const models = { draft: "m" };
const good = {
  models: { m: { inputPerMTok: 1, outputPerMTok: 2 } },
  features: { "writing-feedback": [{ role: "draft", inputTokens: 1, outputTokens: 2 }], "item-generation": [] },
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
});

describe("parsePricing", () => {
  it("reads a well-formed file", () => {
    expect(parsePricing(good, models)).toEqual({
      models,
      prices: { m: { inputPerMTok: 1, outputPerMTok: 2 } },
      features: { "writing-feedback": [{ role: "draft", inputTokens: 1, outputTokens: 2 }], "item-generation": [] },
    });
  });

  it.each([
    ["not an object", null, "expected `models` and `features`"],
    ["no features", { models: {} }, "expected `models` and `features`"],
    ["a price that is not two rates", { ...good, models: { m: { inputPerMTok: -1, outputPerMTok: 2 } } }, "the price of m"],
    ["a price that is not an object", { ...good, models: { m: 2 } }, "the price of m"],
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
