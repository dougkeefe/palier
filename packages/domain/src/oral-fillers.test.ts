import { describe, expect, it } from "vitest";

import { parseOralFillers, parseOralFillersOrThrow } from "./oral-fillers.js";

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
