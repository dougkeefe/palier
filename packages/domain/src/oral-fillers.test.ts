import { describe, expect, it } from "vitest";

import { parseOralFillers, parseOralFillersOrThrow, spokenWords } from "./oral-fillers.js";

const aList = (over: Record<string, unknown> = {}) => ({ en: ["um", "you know"], fr: ["euh", "tu sais"], ...over });

describe("parseOralFillers", () => {
  it("accepts a list per language, phrases included", () => {
    expect(parseOralFillers(aList())).toEqual({ ok: true, fillers: aList() });
  });

  it("refuses a language with no list, or an empty one", () => {
    expect(parseOralFillers({ fr: ["euh"] }).ok).toBe(false);
    expect(parseOralFillers(aList({ en: [] })).ok).toBe(false);
  });

  it("refuses a blank entry and a language it does not know", () => {
    expect(parseOralFillers(aList({ fr: ["euh", "  "] })).ok).toBe(false);
    expect(parseOralFillers(aList({ de: ["äh"] })).ok).toBe(false);
  });

  it("refuses a filler listed twice, whatever its case, naming where", () => {
    expect(parseOralFillers(aList({ fr: ["euh", "Euh"] }))).toEqual({
      ok: false,
      errors: ['fr.1: "Euh" is listed twice'],
    });
  });

  it("refuses a filler listed twice as the metrics read it: spacing, punctuation or apostrophe apart (D127)", () => {
    expect(parseOralFillers(aList({ fr: ["tu sais", "tu  sais"] })).ok).toBe(false);
    expect(parseOralFillers(aList({ fr: ["euh", "euh,"] })).ok).toBe(false);
    expect(parseOralFillers(aList({ fr: ["j'veux dire", "j’veux dire"] })).ok).toBe(false);
  });

  it("refuses an entry with no word in it", () => {
    expect(parseOralFillers(aList({ en: ["um", "…"] }))).toEqual({ ok: false, errors: ['en.1: "…" has no word in it'] });
  });

  it("names the root when the value is not a list at all", () => {
    expect(parseOralFillers("euh")).toEqual({ ok: false, errors: [expect.stringMatching(/^\(root\): /u)] });
  });
});

describe("parseOralFillersOrThrow", () => {
  it("returns the lists", () => {
    expect(parseOralFillersOrThrow(aList()).fr).toEqual(["euh", "tu sais"]);
  });

  it("throws with every problem named", () => {
    expect(() => parseOralFillersOrThrow(aList({ en: [] }))).toThrow(/The oral filler list is not valid:\n {2}en: /u);
  });
});

describe("spokenWords (D127)", () => {
  it("counts an elided or hyphenated word once, in lower case", () => {
    expect(spokenWords("J'ai écrit à la Sous-ministre.")).toEqual(["j'ai", "écrit", "à", "la", "sous-ministre"]);
  });

  it("reads an accent written as two code points as one letter", () => {
    expect(spokenWords("be\u0301ne\u0301ficie")).toEqual(["bénéficie"]);
  });

  it("straightens a curly apostrophe, so both spellings are one word", () => {
    expect(spokenWords("J’ai")).toEqual(spokenWords("J'ai"));
  });

  it("finds no word in punctuation or spaces", () => {
    expect(spokenWords(" … , ")).toEqual([]);
  });
});
