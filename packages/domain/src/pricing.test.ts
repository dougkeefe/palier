import { describe, expect, it } from "vitest";

import { costOf } from "./pricing.js";

describe("costOf", () => {
  const tokens = { inputPerMTok: 2, outputPerMTok: 8 };

  it("prices tokens in and out per million", () => {
    expect(costOf(tokens, { inputTokens: 500_000, outputTokens: 250_000 })).toBe(3);
  });

  it("prices audio by the minute", () => {
    expect(costOf({ perMinute: 0.006 }, { minutes: 2.5 })).toBeCloseTo(0.015, 12);
  });

  it("prices speech per million characters", () => {
    expect(costOf({ perMChars: 15 }, { characters: 200_000 })).toBe(3);
  });

  it("is null, never zero, when the unit the model is priced in was not measured", () => {
    expect(costOf(tokens, { minutes: 1 })).toBeNull();
    expect(costOf(tokens, { inputTokens: 10 })).toBeNull();
    expect(costOf({ perMinute: 0.006 }, { inputTokens: 10, outputTokens: 10 })).toBeNull();
    expect(costOf({ perMChars: 15 }, { minutes: 1 })).toBeNull();
  });

  it("prices a zero measurement as zero, since nothing was billed", () => {
    expect(costOf({ perMChars: 15 }, { characters: 0 })).toBe(0);
  });
});
