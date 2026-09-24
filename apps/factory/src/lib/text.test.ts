import { describe, expect, it } from "vitest";

import {
  estimateBand,
  hasFranceMarker,
  normaliseStem,
  readability,
  tokenJaccard,
  wordCount,
} from "./text.js";

describe("wordCount", () => {
  it("counts whitespace-separated tokens", () => {
    expect(wordCount("le bureau ouvre")).toBe(3);
    expect(wordCount("   ")).toBe(0);
  });
});

describe("readability", () => {
  it("reports sentences, mean length and rare-word ratio", () => {
    const r = readability("Le bureau administration ouvre. Les gens partent.");
    expect(r.sentences).toBe(2);
    expect(r.avgSentenceLength).toBeGreaterThan(0);
    expect(r.rareWordRatio).toBeGreaterThan(0);
  });

  it("treats a body with no terminator as one sentence and empty as zero ratio", () => {
    expect(readability("mot").sentences).toBe(1);
    expect(readability("").rareWordRatio).toBe(0);
  });
});

describe("estimateBand", () => {
  it("returns A for short words, C for many long words", () => {
    expect(estimateBand("le chat va au parc vite")).toBe("A");
    expect(estimateBand("administration coordination réglementation gouvernance approbation")).toBe("C");
  });

  it("returns B for a moderate long-word ratio", () => {
    expect(estimateBand("administration coordination le chat va au parc vite ici bas")).toBe("B");
  });

  it("returns A for an empty string", () => {
    expect(estimateBand("")).toBe("A");
  });
});

describe("normaliseStem and tokenJaccard", () => {
  it("lowercases and strips punctuation", () => {
    expect(normaliseStem("Le  chat, va!")).toBe("le chat va");
  });

  it("scores identical sets 1 and disjoint sets 0", () => {
    expect(tokenJaccard("a b c", "a b c")).toBe(1);
    expect(tokenJaccard("a b", "c d")).toBe(0);
    expect(tokenJaccard("", "")).toBe(1);
  });
});

describe("hasFranceMarker", () => {
  it("flags a France-specific token and passes clean text", () => {
    expect(hasFranceMarker("envoyez un mail demain")).toBe(true);
    expect(hasFranceMarker("envoyez un courriel demain")).toBe(false);
  });
});
