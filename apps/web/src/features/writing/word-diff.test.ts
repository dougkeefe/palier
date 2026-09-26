import { describe, expect, it } from "vitest";

import { MAX_DIFF_CELLS, wordDiff } from "./word-diff";

describe("wordDiff", () => {
  it("is nothing for two empty texts", () => {
    expect(wordDiff("", "  ")).toEqual([]);
  });

  it("is one kept run when nothing changed, whatever the whitespace", () => {
    expect(wordDiff("la réunion  est\nreportée", "la réunion est reportée")).toEqual([
      { kind: "same", text: "la réunion est reportée" },
    ]);
  });

  it("shows a changed word as its removal, then its replacement, between kept runs", () => {
    expect(wordDiff("la réunion est reporter à mardi", "la réunion est reportée à mardi")).toEqual([
      { kind: "same", text: "la réunion est" },
      { kind: "removed", text: "reporter" },
      { kind: "added", text: "reportée" },
      { kind: "same", text: "à mardi" },
    ]);
  });

  it("groups neighbouring additions into one run", () => {
    expect(wordDiff("Merci.", "Merci de votre compréhension.")).toEqual([
      { kind: "removed", text: "Merci." },
      { kind: "added", text: "Merci de votre compréhension." },
    ]);
    expect(wordDiff("Bonjour Merci", "Bonjour à tous Merci")).toEqual([
      { kind: "same", text: "Bonjour" },
      { kind: "added", text: "à tous" },
      { kind: "same", text: "Merci" },
    ]);
  });

  it("shows words dropped at the end as removed, and a text written from nothing as added", () => {
    expect(wordDiff("un deux trois", "un")).toEqual([
      { kind: "same", text: "un" },
      { kind: "removed", text: "deux trois" },
    ]);
    expect(wordDiff("", "un deux")).toEqual([{ kind: "added", text: "un deux" }]);
    expect(wordDiff("un deux", "")).toEqual([{ kind: "removed", text: "un deux" }]);
  });

  it("keeps the longest common run of words, not the first match", () => {
    const runs = wordDiff("a b c d", "b c d a");
    expect(runs.filter((r) => r.kind === "same").map((r) => r.text)).toEqual(["b c d"]);
  });

  it("shows texts too far apart to diff as one replacement, rather than exhaust memory", () => {
    const words = (n: number, w: string) => Array.from({ length: n }, () => w).join(" ");
    const side = Math.ceil(Math.sqrt(MAX_DIFF_CELLS)) + 1;
    expect(wordDiff(words(side, "x"), words(side, "y"))).toEqual([
      { kind: "removed", text: words(side, "x") },
      { kind: "added", text: words(side, "y") },
    ]);
  });
});
