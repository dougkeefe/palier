import { describe, expect, it } from "vitest";

import { ORAL_END_REASONS, ORAL_SPEAKERS } from "./oral-session.js";
import { oralTurnSchema } from "./schemas/oral.js";

const aTurn = (over: Record<string, unknown> = {}) => ({
  speaker: "candidate",
  text: "Je travaille aux finances.",
  phase: 0,
  startMs: 1_000,
  endMs: 4_500,
  ...over,
});

describe("the oral session vocabulary", () => {
  it("names every end reason, with completion first", () => {
    expect(ORAL_END_REASONS).toEqual(["completed", "ended-by-user", "transport-closed", "transport-failed", "interrupted"]);
  });

  it("has two speakers", () => {
    expect(ORAL_SPEAKERS).toEqual(["examiner", "candidate"]);
  });
});

describe("oralTurnSchema", () => {
  it("accepts a whole turn", () => {
    expect(oralTurnSchema.safeParse(aTurn()).success).toBe(true);
  });

  it("accepts an instant turn and an empty transcription", () => {
    expect(oralTurnSchema.safeParse(aTurn({ text: "", startMs: 10, endMs: 10 })).success).toBe(true);
  });

  it("rejects a turn that ends before it starts", () => {
    const result = oralTurnSchema.safeParse(aTurn({ startMs: 5_000, endMs: 4_000 }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("a turn cannot end before it starts");
  });

  it.each([
    ["an unknown speaker", { speaker: "narrator" }],
    ["a negative phase", { phase: -1 }],
    ["a fractional phase", { phase: 0.5 }],
    ["a negative start", { startMs: -1 }],
    ["a fractional end", { endMs: 4_500.5 }],
    ["text that is not a string", { text: 3 }],
    ["an extra field", { confidence: 0.9 }],
  ])("rejects %s", (_name, over) => {
    expect(oralTurnSchema.safeParse(aTurn(over)).success).toBe(false);
  });
});
