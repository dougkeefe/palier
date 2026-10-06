import { describe, expect, it } from "vitest";

import type { Attempt, DiagnosticRules, Item, SubSkill, TargetBand } from "@palier/domain";
import { attemptId, itemId, sessionId } from "@palier/domain";

import { latestCompleteRun, summariseDiagnostic } from "./diagnostic-summary.js";
import { anAttempt, anItem } from "./__tests__/fixtures.js";

/**
 * A diagnostic run read back (ADR 25): which run counts, its score by band and by sub-skill,
 * and where it starts the plan. Counts only, never a band (ADR 7).
 */
const RULES: DiagnosticRules = {
  size: 4,
  bandQuota: { B: 2, C: 2 },
  secureAccuracy: 0.7,
  startShare: 0.7,
  focusCount: 2,
  retakeDays: 28,
};

const item = (id: string, subSkill: SubSkill, targetBand: TargetBand): Item =>
  anItem({ id: itemId(id), subSkill, targetBand, skill: "writing", lang: "fr" });

let serial = 0;
const answer = (run: string, id: string, correct: boolean, ts: string, over: Partial<Attempt> = {}): Attempt => {
  serial += 1;
  return anAttempt({
    id: attemptId(`01HATT${String(serial).padStart(18, "0")}`),
    itemId: itemId(id),
    sessionId: sessionId(run),
    skill: "writing",
    mode: "diagnostic",
    correct,
    ts,
    ...over,
  });
};

const at = (minute: number): string => `2026-10-01T10:${String(minute).padStart(2, "0")}:00.000Z`;

const ITEMS: Item[] = [
  item("b1", "agreement", "B"),
  item("b2", "agreement", "B"),
  item("b3", "pronouns", "B"),
  item("c1", "prepositions-and-government", "C"),
  item("c2", "prepositions-and-government", "C"),
  item("c3", "pronouns", "C"),
];

/** A run of the four given items, answered in order a minute apart from `start`. */
const runOf = (run: string, start: number, answers: readonly (readonly [string, boolean])[]): Attempt[] =>
  answers.map(([id, correct], i) => answer(run, id, correct, at(start + i)));

describe("latestCompleteRun", () => {
  it("is null when no diagnostic was ever finished", () => {
    expect(latestCompleteRun("writing", [], 4)).toBeNull();
  });

  it("ignores a run left part-way, however recent", () => {
    const whole = runOf("whole", 0, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]);
    const partial = runOf("partial", 30, [["b3", true], ["c3", false]]);

    expect(latestCompleteRun("writing", [...whole, ...partial], 4)?.sessionId).toBe(sessionId("whole"));
  });

  it("takes the newest of two whole runs, by its last answer", () => {
    const older = runOf("older", 0, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]);
    const newer = runOf("newer", 20, [["b1", false], ["b2", false], ["c1", false], ["c2", false]]);

    const run = latestCompleteRun("writing", [...newer, ...older], 4);
    expect(run?.sessionId).toBe(sessionId("newer"));
    expect(run?.takenAt).toBe(at(23));
  });

  it("breaks a tie on the last answer by session id, so every device agrees", () => {
    const a = runOf("run-a", 0, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]);
    const b = runOf("run-b", 0, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]);

    expect(latestCompleteRun("writing", [...a, ...b], 4)?.sessionId).toBe(sessionId("run-b"));
    expect(latestCompleteRun("writing", [...b, ...a], 4)?.sessionId).toBe(sessionId("run-b"));
  });

  it("keeps a run's answers oldest first, whatever order they arrived in", () => {
    const run = runOf("r", 0, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]);

    const read = latestCompleteRun("writing", [...run].reverse(), 4);
    expect(read?.attempts.map((a) => a.itemId)).toEqual(run.map((a) => a.itemId));
  });

  it("orders equal instants within a run by attempt id", () => {
    const run = ["b1", "b2", "c1", "c2"].map((id) => answer("r", id, true, at(0)));

    const read = latestCompleteRun("writing", [...run].reverse(), 4);
    expect(read?.attempts.map((a) => a.id)).toEqual(run.map((a) => a.id));
  });

  it("counts only diagnostic answers at the skill asked for", () => {
    const drill = runOf("drill", 0, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]).map((a) => ({
      ...a,
      mode: "drill" as const,
    }));
    const reading = runOf("reading", 10, [["b1", true], ["b2", true], ["c1", true], ["c2", true]]).map((a) => ({
      ...a,
      skill: "reading" as const,
    }));

    expect(latestCompleteRun("writing", [...drill, ...reading], 4)).toBeNull();
  });

  it("needs distinct items, so an answer given twice does not complete a run", () => {
    const twice = runOf("r", 0, [["b1", true], ["b1", true], ["c1", true], ["c2", true]]);

    expect(latestCompleteRun("writing", twice, 4)).toBeNull();
  });
});

describe("summariseDiagnostic", () => {
  const summary = (answers: readonly (readonly [string, boolean])[], targetBand: TargetBand = "C", rules = RULES) => {
    const run = latestCompleteRun("writing", runOf("r", 0, answers), answers.length);
    if (run === null) throw new Error("the run should be complete");
    return summariseDiagnostic("writing", run, ITEMS, { ...rules, size: answers.length }, targetBand);
  };

  it("counts the whole run, right and wrong, and each band it held", () => {
    const result = summary([["b1", true], ["b2", true], ["b3", false], ["c1", false], ["c2", true], ["c3", false]]);

    expect(result.total).toEqual({ correct: 3, attempted: 6 });
    expect(result.bands).toEqual([
      { band: "B", correct: 2, attempted: 3 },
      { band: "C", correct: 1, attempted: 3 },
    ]);
  });

  it("lists no band the run held no item at, rather than a zero", () => {
    const result = summary([["c1", true], ["c2", true], ["c3", true]]);

    expect(result.bands.map((b) => b.band)).toEqual(["C"]);
  });

  it("starts the plan at the target when the target band was answered securely", () => {
    expect(summary([["b1", true], ["b2", false], ["c1", true], ["c2", true], ["c3", true]]).startBand).toBe("C");
  });

  it("starts the plan a band lower when only that band was secure", () => {
    expect(summary([["b1", true], ["b2", true], ["b3", true], ["c1", false], ["c2", true], ["c3", false]]).startBand).toBe("B");
  });

  it("starts at the lowest band the run held when no band was secure", () => {
    expect(summary([["b1", false], ["b2", false], ["b3", true], ["c1", false], ["c2", false], ["c3", false]]).startBand).toBe("B");
  });

  it("never starts above the target, however well the band above went", () => {
    expect(summary([["b1", false], ["b2", false], ["b3", false], ["c1", true], ["c2", true], ["c3", true]], "B").startBand).toBe("B");
  });

  it("starts at the target when the run held no band at or below it", () => {
    expect(summary([["c1", true], ["c2", true], ["c3", true]], "B").startBand).toBe("B");
  });

  it("focuses on the weakest sub-skills with a miss and enough answers, at most the profile's count", () => {
    const result = summary([["b1", false], ["b2", false], ["b3", true], ["c1", true], ["c2", false], ["c3", true]]);

    expect(result.focusSubSkills).toEqual(["agreement", "prepositions-and-government"]);
    expect(summary([["b1", false], ["b2", false], ["c1", true], ["c2", false]], "C", { ...RULES, focusCount: 1 }).focusSubSkills).toEqual([
      "agreement",
    ]);
  });

  it("names no focus or strength from a single answer", () => {
    const result = summary([["b1", false], ["b3", true], ["c1", true]]);

    expect(result.focusSubSkills).toEqual([]);
    expect(result.strengths).toEqual([]);
  });

  it("calls a sub-skill a strength when it was answered securely, strongest first", () => {
    const result = summary([["b1", true], ["b2", true], ["b3", true], ["c1", true], ["c2", false], ["c3", true]]);

    expect(result.strengths).toEqual(["pronouns", "agreement"]);
    expect(result.focusSubSkills).toEqual(["prepositions-and-government"]);
  });

  it("leaves out an answer whose item the bank no longer holds, from every figure", () => {
    const run = latestCompleteRun(
      "writing",
      [...runOf("r", 0, [["b1", true], ["c1", false], ["c2", true]]), answer("r", "gone", true, at(9))],
      4,
    );
    if (run === null) throw new Error("the run should be complete");

    const result = summariseDiagnostic("writing", run, ITEMS, RULES, "C");
    expect(result.total).toEqual({ correct: 2, attempted: 3 });
    expect(result.sessionId).toBe(sessionId("r"));
    expect(result.takenAt).toBe(at(9));
  });
});
