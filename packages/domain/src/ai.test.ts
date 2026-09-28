import { describe, expect, it } from "vitest";

import { AI_FEATURES } from "./ai.js";

describe("AI_FEATURES", () => {
  it("names each feature that spends the key once, and no key check", () => {
    expect(new Set(AI_FEATURES).size).toBe(AI_FEATURES.length);
    expect(AI_FEATURES).toEqual(["writing-feedback", "item-generation", "oral-practice"]);
  });
});
