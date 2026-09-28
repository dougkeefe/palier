import { describe, expect, it } from "vitest";

import type { OralTurn } from "@palier/domain";

import { fluencyMetrics } from "./fluency.js";

const FILLERS = ["euh", "ben", "tu sais", "en fait"];

const examiner = (endMs: number, text = "Une question ?"): OralTurn => ({
  speaker: "examiner",
  text,
  phase: 0,
  startMs: endMs,
  endMs,
});

const spoken = (startMs: number, endMs: number, text: string): OralTurn => ({
  speaker: "candidate",
  text,
  phase: 0,
  startMs,
  endMs,
  input: "voice",
});

const typed = (startMs: number, endMs: number, text: string): OralTurn => ({
  speaker: "candidate",
  text,
  phase: 0,
  startMs,
  endMs,
  input: "typed",
});

describe("fluencyMetrics (D123)", () => {
  it("measures nothing, with nulls rather than zeros, when no answer was spoken", () => {
    const metrics = fluencyMetrics([examiner(1_000), typed(1_000, 30_000, "Euh, je suis analyste.")], FILLERS);
    expect(metrics).toEqual({ spokenTurns: 0, wordsPerMinute: null, fillerCount: null, meanPauseMs: null });
  });

  it("counts a turn stored before Slice 3, with no input, as untimed", () => {
    const { input: _input, ...legacy } = spoken(2_000, 8_000, "Je suis analyste.");
    expect(fluencyMetrics([examiner(1_000), legacy], FILLERS).spokenTurns).toBe(0);
  });

  it("gives the words of every spoken answer over the minutes they took", () => {
    // 6 words in 3 s and 6 words in 3 s: 12 words in 6 s, 120 a minute.
    const metrics = fluencyMetrics(
      [
        examiner(0),
        spoken(1_000, 4_000, "Je suis analyste des politiques publiques."),
        examiner(5_000),
        spoken(6_000, 9_000, "Je rédige des notes d'information urgentes."),
      ],
      FILLERS,
    );
    expect(metrics.wordsPerMinute).toBe(120);
    expect(metrics.spokenTurns).toBe(2);
  });

  it("counts an elided or hyphenated word once: j'ai, sous-ministre", () => {
    // "J'ai écrit à la sous-ministre": 5 words in 6 s is 50 a minute.
    expect(fluencyMetrics([spoken(0, 6_000, "J'ai écrit à la sous-ministre.")], FILLERS).wordsPerMinute).toBe(50);
  });

  it("has no rate for spoken answers of no length", () => {
    expect(fluencyMetrics([spoken(4_000, 4_000, "Oui.")], FILLERS).wordsPerMinute).toBeNull();
  });

  it("counts fillers whole, in any case, phrases of two words included", () => {
    const metrics = fluencyMetrics(
      [spoken(0, 10_000, "Euh, ben... EUH, tu sais, en fait je bénéficie d'un budget, euh.")],
      FILLERS,
    );
    // euh ×3, ben ×1, tu sais ×1, en fait ×1; "bénéficie" holds no "ben".
    expect(metrics.fillerCount).toBe(6);
  });

  it("counts a filler in no typed answer, and ignores a blank entry in the list", () => {
    const metrics = fluencyMetrics([spoken(0, 1_000, "Je suis là."), typed(1_000, 2_000, "euh euh euh")], [...FILLERS, "  "]);
    expect(metrics.fillerCount).toBe(0);
  });

  it("gives the mean pause from each question's end to the spoken answer after it", () => {
    const metrics = fluencyMetrics(
      [examiner(1_000), spoken(2_000, 5_000, "Oui."), examiner(6_000), spoken(9_000, 12_000, "Non.")],
      FILLERS,
    );
    expect(metrics.meanPauseMs).toBe(2_000); // (1 000 + 3 000) / 2
  });

  it("clamps an answer that overlaps its question to no pause", () => {
    expect(fluencyMetrics([examiner(5_000), spoken(4_000, 8_000, "Oui.")], FILLERS).meanPauseMs).toBe(0);
  });

  it("times no pause for a typed answer, nor for a spoken one with no question before it", () => {
    const metrics = fluencyMetrics(
      [spoken(0, 1_000, "Bonjour."), examiner(2_000), typed(9_000, 9_000, "Je suis là."), spoken(12_000, 13_000, "Voilà.")],
      FILLERS,
    );
    expect(metrics.spokenTurns).toBe(2);
    expect(metrics.meanPauseMs).toBeNull();
  });
});
