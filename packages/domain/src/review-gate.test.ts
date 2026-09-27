import { describe, expect, it } from "vitest";

import { aValidItem, aValidPassage } from "./__tests__/fixtures.js";
import type { ReviewVerdict } from "./index.js";
import { CONFIDENCE_THRESHOLD, gateReasons, passageId, reviewRequestFor } from "./index.js";

const aVerdict = (over: Partial<ReviewVerdict> = {}): ReviewVerdict => ({
  chosenKey: "a",
  confidence: 0.9,
  defensibleDistractors: [],
  optionCases: { a: "Correct.", b: "Indicative.", c: "Rejected.", d: "Indicative." },
  registerFlag: { flagged: false },
  estimatedBand: "C",
  ...over,
});

describe("gateReasons (progress.md D109)", () => {
  it("passes an item the reviewer keys correctly, confidently, cleanly and within a band", () => {
    expect(gateReasons(aValidItem(), aVerdict())).toEqual([]);
  });

  it("discards when the reviewer chooses another key, in the factory's exact words", () => {
    expect(gateReasons(aValidItem(), aVerdict({ chosenKey: "b" }))).toEqual([
      'reviewer chose "b", intended "a"',
    ]);
  });

  it("discards below the confidence threshold and keeps an item exactly at it", () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
    expect(gateReasons(aValidItem(), aVerdict({ confidence: 0.69 }))).toEqual([
      "confidence 0.69 below 0.7",
    ]);
    expect(gateReasons(aValidItem(), aVerdict({ confidence: 0.7 }))).toEqual([]);
  });

  it("discards when any distractor is defensible, naming them", () => {
    expect(gateReasons(aValidItem(), aVerdict({ defensibleDistractors: ["b", "d"] }))).toEqual([
      "defensible distractor(s): b, d",
    ]);
  });

  it("discards on a register flag, with its note when there is one", () => {
    expect(gateReasons(aValidItem(), aVerdict({ registerFlag: { flagged: true } }))).toEqual([
      "register flag",
    ]);
    expect(
      gateReasons(aValidItem(), aVerdict({ registerFlag: { flagged: true, note: "France usage" } })),
    ).toEqual(["register flag: France usage"]);
  });

  it("discards an estimate more than one band from the tag and keeps one band away", () => {
    expect(gateReasons(aValidItem(), aVerdict({ estimatedBand: "A" }))).toEqual([
      "estimated band A is more than one band from C",
    ]);
    expect(gateReasons(aValidItem(), aVerdict({ estimatedBand: "B" }))).toEqual([]);
  });

  it("reports every failing judgement, in order", () => {
    const reasons = gateReasons(
      aValidItem(),
      aVerdict({ chosenKey: "c", confidence: 0.2, defensibleDistractors: ["b"], estimatedBand: "A" }),
    );
    expect(reasons.map((r) => r.split(" ")[0])).toEqual(["reviewer", "confidence", "defensible", "estimated"]);
  });
});

describe("reviewRequestFor", () => {
  it("is blind to the key: no key, no rationale and no explanation reach the reviewer", () => {
    const item = aValidItem();
    const request = reviewRequestFor(item);
    expect(request).toEqual({
      itemType: "error-id",
      stem: item.stem,
      options: item.options.map((o) => ({ id: o.id, text: o.text })),
      subSkill: item.subSkill,
      targetBand: item.targetBand,
      lang: "fr",
    });
    const text = JSON.stringify(request);
    expect(text).not.toContain("Indicatif");
    expect(text).not.toContain("subjonctif");
    expect(request).not.toHaveProperty("key");
  });

  it("carries the passage of a passage item when it is known", () => {
    const passage = aValidPassage();
    const item = aValidItem({ type: "comprehension", passageId: passage.id });
    expect(reviewRequestFor(item, new Map([[passage.id, passage]])).passage).toEqual({
      title: passage.title,
      body: passage.body,
    });
    expect(reviewRequestFor(aValidItem({ passageId: passageId("unknown") })).passage).toBeUndefined();
  });
});
