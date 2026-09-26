import { describe, expect, it } from "vitest";

import { segmentText } from "./inline-errors";

const anError = (start: number, end: number, correction = "fix") => ({ start, end, correction, rule: "r" });

describe("segmentText", () => {
  it("is the whole text, plain, when there is no error", () => {
    expect(segmentText("Tout va bien.", [])).toEqual([{ kind: "plain", text: "Tout va bien." }]);
  });

  it("is nothing for an empty text", () => {
    expect(segmentText("", [])).toEqual([]);
  });

  it("cuts the text at each error, numbering them in reading order whatever order they came in", () => {
    const text = "Je vous écrit pour vous informé.";
    const late = anError(24, 31, "informer");
    const early = anError(8, 13, "écris");
    expect(segmentText(text, [late, early])).toEqual([
      { kind: "plain", text: "Je vous " },
      { kind: "error", text: "écrit", number: 1, error: early },
      { kind: "plain", text: " pour vous " },
      { kind: "error", text: "informé", number: 2, error: late },
      { kind: "plain", text: "." },
    ]);
  });

  it("draws errors at the very start and end, and side by side, with no empty plain segment", () => {
    const first = anError(0, 2);
    const second = anError(2, 4);
    expect(segmentText("abcd", [first, second])).toEqual([
      { kind: "error", text: "ab", number: 1, error: first },
      { kind: "error", text: "cd", number: 2, error: second },
    ]);
  });
});
