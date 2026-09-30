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

  const realtime = {
    textInputPerMTok: 4,
    textOutputPerMTok: 24,
    audioInputPerMTok: 32,
    audioOutputPerMTok: 64,
    cachedInputPerMTok: 0.4,
  };
  const realtimeTokens = {
    textInputTokens: 250_000,
    textOutputTokens: 125_000,
    audioInputTokens: 125_000,
    audioOutputTokens: 62_500,
    cachedInputTokens: 2_500_000,
  };

  it("prices a realtime call's text, audio and cached input each at its own rate (D167)", () => {
    // 1 text in + 3 text out + 4 audio in + 4 audio out + 1 cached
    expect(costOf(realtime, realtimeTokens)).toBeCloseTo(13, 12);
  });

  it.each(Object.keys(realtimeTokens))("is null for a realtime call whose %s was not measured", (unit) => {
    expect(costOf(realtime, { ...realtimeTokens, [unit]: undefined })).toBeNull();
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
