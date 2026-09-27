import { describe, expect, it } from "vitest";

import type { WritingError, WritingFeedbackDraft } from "./ai.js";
import { WRITING_CRITERIA } from "./ai.js";
import { assembleAssessment, checkErrorOffsets, placeErrors } from "./writing.js";

const anError = (start: number, end: number): WritingError => ({
  start,
  end,
  correction: "fix",
  rule: "rule",
});

const TEXT = "Je vous écris pour vous informer que la réunion est reporter.";

describe("WRITING_CRITERIA", () => {
  it("names the five criteria of PRD §8.7 and architecture.md §8.4, in display order", () => {
    expect(WRITING_CRITERIA).toEqual(["register", "structure", "grammar", "vocabulary", "task"]);
  });
});

describe("checkErrorOffsets", () => {
  it("accepts no errors at all", () => {
    expect(checkErrorOffsets(TEXT, [])).toBeNull();
  });

  it("accepts ranges inside the text, including one ending at its last character", () => {
    expect(checkErrorOffsets("abcdef", [anError(0, 2), anError(4, 6)])).toBeNull();
  });

  it("accepts adjacent ranges, since touching is not overlapping", () => {
    expect(checkErrorOffsets("abcdef", [anError(0, 3), anError(3, 5)])).toBeNull();
  });

  it("accepts ranges out of reading order", () => {
    expect(checkErrorOffsets("abcdef", [anError(4, 6), anError(0, 2)])).toBeNull();
  });

  it("refuses an offset that is not a whole number", () => {
    expect(checkErrorOffsets("abcdef", [anError(0.5, 2)])).toMatch(/whole numbers/u);
    expect(checkErrorOffsets("abcdef", [anError(0, Number.NaN)])).toMatch(/whole numbers/u);
  });

  it("refuses a range that starts before the text", () => {
    expect(checkErrorOffsets("abcdef", [anError(-1, 2)])).toMatch(/error 0: \[-1, 2\)/u);
  });

  it("refuses a range that ends past the text", () => {
    expect(checkErrorOffsets("abcdef", [anError(0, 2), anError(4, 7)])).toMatch(
      /error 1: \[4, 7\) is not a range inside a text of 6 characters/u,
    );
  });

  it("refuses an empty or reversed range", () => {
    expect(checkErrorOffsets("abcdef", [anError(2, 2)])).toMatch(/\[2, 2\)/u);
    expect(checkErrorOffsets("abcdef", [anError(3, 1)])).toMatch(/\[3, 1\)/u);
  });

  it("refuses ranges that overlap, whatever order they arrive in", () => {
    expect(checkErrorOffsets("abcdef", [anError(3, 5), anError(0, 4)])).toBe(
      "errors [0, 4) and [3, 5) overlap",
    );
  });
});

describe("placeErrors", () => {
  it("places each excerpt at its offsets in the text", () => {
    const result = placeErrors(TEXT, [{ excerpt: "reporter", correction: "reportée", rule: "accord" }]);
    const start = TEXT.indexOf("reporter");
    expect(result).toEqual({
      ok: true,
      errors: [{ start, end: start + 8, correction: "reportée", rule: "accord" }],
    });
  });

  it("places a repeated phrase at its next occurrence, each from where the last ended", () => {
    const result = placeErrors("vous et vous", [
      { excerpt: "vous", correction: "a", rule: "r" },
      { excerpt: "vous", correction: "b", rule: "r" },
    ]);
    expect(result).toEqual({
      ok: true,
      errors: [
        { start: 0, end: 4, correction: "a", rule: "r" },
        { start: 8, end: 12, correction: "b", rule: "r" },
      ],
    });
  });

  it("still places a list out of reading order, and returns it in reading order", () => {
    const result = placeErrors("un deux trois", [
      { excerpt: "trois", correction: "3", rule: "r" },
      { excerpt: "un", correction: "1", rule: "r" },
    ]);
    expect(result.ok && result.errors.map((e) => e.correction)).toEqual(["1", "3"]);
  });

  it("refuses an excerpt that is not in the text", () => {
    expect(placeErrors(TEXT, [{ excerpt: "absent", correction: "x", rule: "r" }])).toEqual({
      ok: false,
      problem: 'error 0: "absent" is not in the text',
    });
  });

  it("refuses an empty excerpt, which would place anywhere", () => {
    expect(placeErrors(TEXT, [{ excerpt: "", correction: "x", rule: "r" }])).toEqual({
      ok: false,
      problem: "error 0: the excerpt is empty",
    });
  });

  it("refuses two excerpts that land on the same words", () => {
    const result = placeErrors("abcdef", [
      { excerpt: "bcd", correction: "x", rule: "r" },
      { excerpt: "abc", correction: "y", rule: "r" },
    ]);
    expect(result).toEqual({ ok: false, problem: "errors [0, 3) and [1, 4) overlap" });
  });
});

describe("assembleAssessment", () => {
  const criterion = { band: "B" as const, evidence: "e" };
  const aDraft = (excerpt: string): WritingFeedbackDraft => ({
    criteria: {
      register: criterion,
      structure: criterion,
      grammar: criterion,
      vocabulary: criterion,
      task: criterion,
    },
    errors: [{ excerpt, correction: "c", rule: "r" }],
    modelAnswer: "Une réponse modèle.",
  });

  it("makes a draft whole, keeping its criteria and model answer", () => {
    const result = assembleAssessment("abc", aDraft("b"));
    expect(result).toEqual({
      ok: true,
      assessment: {
        criteria: aDraft("b").criteria,
        errors: [{ start: 1, end: 2, correction: "c", rule: "r" }],
        modelAnswer: "Une réponse modèle.",
      },
    });
  });

  it("passes on the reason a draft's errors cannot be placed", () => {
    expect(assembleAssessment("abc", aDraft("z"))).toEqual({
      ok: false,
      problem: 'error 0: "z" is not in the text',
    });
  });
});
