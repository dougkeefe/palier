import { describe, expect, it } from "vitest";

import type { Passage } from "@palier/domain";

import { checkPassage } from "./passages.js";

const passage = (over: Partial<Passage>): Passage => ({
  id: "P1" as Passage["id"],
  lang: "fr",
  docType: "memo",
  title: "Note",
  body: "Phrase une. Phrase deux. Phrase trois.",
  wordCount: 60,
  targetBand: "B",
  topic: "human-resources",
  readability: { sentences: 4, avgSentenceLength: 12, rareWordRatio: 0.2 },
  source: { kind: "original" },
  status: "published",
  ...over,
});

describe("checkPassage", () => {
  it("passes a well-formed passage", () => {
    expect(checkPassage(passage({}))).toEqual([]);
  });

  it("rejects a word count outside the band range", () => {
    expect(checkPassage(passage({ wordCount: 5 })).join(" ")).toMatch(/word count/);
  });

  it("rejects too few sentences", () => {
    expect(checkPassage(passage({ readability: { sentences: 2, avgSentenceLength: 10, rareWordRatio: 0.1 } })).join(" ")).toMatch(/three sentences/);
  });

  it("rejects a long number and an acronym", () => {
    const reasons = checkPassage(passage({ body: "Le rapport 12345 vient du CRTC officiel." })).join(" ");
    expect(reasons).toMatch(/departmental figure/);
    expect(reasons).toMatch(/acronym/);
  });
});
