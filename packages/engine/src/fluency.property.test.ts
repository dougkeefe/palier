import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { OralTurn } from "@palier/domain";

import { fluencyMetrics } from "./fluency.js";

/**
 * implementation-plan.md §6.2, tier 2, over any session (D123): the order of the turns does
 * not change what was said, typed answers change no metric, and a filler said once more is
 * counted once more.
 */
const FILLERS = ["euh", "tu sais"];
const WORDS = ["je", "suis", "analyste", "budget", "euh", "tu", "sais", "les", "provinces"];

const text = fc.array(fc.constantFrom(...WORDS), { maxLength: 12 }).map((words) => words.join(" "));

const turn: fc.Arbitrary<OralTurn> = fc
  .record({
    speaker: fc.constantFrom("examiner" as const, "candidate" as const),
    input: fc.constantFrom("voice" as const, "typed" as const),
    text,
    startMs: fc.integer({ min: 0, max: 600_000 }),
    lengthMs: fc.integer({ min: 0, max: 60_000 }),
    pauseMs: fc.option(fc.integer({ min: 0, max: 20_000 }), { nil: undefined }),
  })
  .map(({ speaker, input, text: words, startMs, lengthMs, pauseMs }) => ({
    speaker,
    text: words,
    phase: 0,
    startMs,
    endMs: startMs + lengthMs,
    ...(speaker === "candidate" ? { input } : {}),
    ...(speaker === "candidate" && input === "voice" && pauseMs !== undefined ? { pauseMs } : {}),
  }));

const session = fc.array(turn, { maxLength: 20 });

describe("fluencyMetrics properties", () => {
  it("gives the same words a minute, fillers and pause whatever order the turns are in", () => {
    fc.assert(
      fc.property(session, (turns) => {
        const forward = fluencyMetrics(turns, FILLERS);
        const backward = fluencyMetrics([...turns].reverse(), FILLERS);
        expect(backward.wordsPerMinute).toBe(forward.wordsPerMinute);
        expect(backward.fillerCount).toBe(forward.fillerCount);
        expect(backward.spokenTurns).toBe(forward.spokenTurns);
        expect(backward.meanPauseMs).toBeCloseTo(forward.meanPauseMs ?? 0, 6);
      }),
    );
  });

  it("changes no metric for a typed answer added anywhere after the last question", () => {
    fc.assert(
      fc.property(session, text, (turns, words) => {
        const typed: OralTurn = { speaker: "candidate", text: words, phase: 0, startMs: 0, endMs: 1_000, input: "typed" };
        expect(fluencyMetrics([...turns, typed], FILLERS)).toEqual(fluencyMetrics(turns, FILLERS));
      }),
    );
  });

  it("counts exactly one more filler for one more said at the end of a spoken answer", () => {
    fc.assert(
      fc.property(session, text, (turns, words) => {
        const answer: OralTurn = { speaker: "candidate", text: words, phase: 0, startMs: 0, endMs: 5_000, input: "voice" };
        const before = fluencyMetrics([...turns, answer], FILLERS).fillerCount ?? 0;
        const after = fluencyMetrics([...turns, { ...answer, text: `${words} euh` }], FILLERS).fillerCount ?? 0;
        expect(after).toBe(before + 1);
      }),
    );
  });

  it("never gives a negative rate or pause, and a count only when something was spoken", () => {
    fc.assert(
      fc.property(session, (turns) => {
        const metrics = fluencyMetrics(turns, FILLERS);
        if (metrics.spokenTurns === 0) expect(metrics.fillerCount).toBeNull();
        else expect(metrics.fillerCount).toBeGreaterThanOrEqual(0);
        expect(metrics.wordsPerMinute ?? 0).toBeGreaterThanOrEqual(0);
        expect(metrics.meanPauseMs ?? 0).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
