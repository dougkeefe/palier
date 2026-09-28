import type { OralReport, OralSession } from "@palier/app";
import {
  NothingToAssessError,
  OralSessionRunningError,
  UnknownOralSessionError,
  UnknownScenarioError,
} from "@palier/app";
import type { OralTurn } from "@palier/domain";
import { scenarioId, sessionId } from "@palier/domain";
import type { Preflight } from "@palier/engine";
import { describe, expect, it } from "vitest";

import {
  INITIAL_REPORT,
  ORAL_CRITERION_ROWS,
  type ReportState,
  askFailureMessage,
  blockMessage,
  canRetry,
  costRows,
  drillHref,
  drillMessage,
  drillSkill,
  endReportLink,
  feedbackLangFor,
  fluencyWords,
  historyTag,
  reportScreen,
  transcriptRows,
} from "./report-view";

const named = (name: string) => Object.assign(new Error(name), { name });
const PREFLIGHT: Preflight = { estimateUsd: 0.02, before: "none", after: "none" };

const REPORT: OralReport = {
  session: {
    id: sessionId("oral-1"),
    scenarioId: scenarioId("s"),
    startedAt: "2026-09-28T10:00:00.000Z",
    endedAt: "2026-09-28T10:10:00.000Z",
    endReason: "completed",
    turns: [],
    assessment: null,
  },
  scenario: null,
  fluency: { spokenTurns: 0, wordsPerMinute: null, fillerCount: null, meanPauseMs: null },
  cost: { practice: { usd: 0, calls: 0, unpriced: 0 }, report: { usd: 0, calls: 0, unpriced: 0 } },
  blocked: null,
};

const run = (...actions: Parameters<typeof reportScreen>[1][]): ReportState => actions.reduce(reportScreen, INITIAL_REPORT);
const ready = () => run({ type: "loaded", report: REPORT });

describe("reportScreen, the steps (D126)", () => {
  it("shows the session once it is loaded, with nothing asked yet", () => {
    expect(ready()).toEqual({ phase: "ready", report: REPORT, ask: { kind: "idle" } });
  });

  it("says a session this device does not hold is not found", () => {
    expect(run({ type: "loaded", report: null })).toEqual({ phase: "not-found" });
  });

  it("offers the pre-flight, lets it be cancelled, and asks", () => {
    const confirming = reportScreen(ready(), { type: "preflighted", preflight: PREFLIGHT });
    expect(confirming).toMatchObject({ ask: { kind: "confirming", preflight: PREFLIGHT } });
    expect(reportScreen(confirming, { type: "cancel" })).toMatchObject({ ask: { kind: "idle" } });
    expect(reportScreen(confirming, { type: "asking" })).toMatchObject({ ask: { kind: "asking" } });
  });

  it("ignores a pre-flight or a cancel while the call is out, so the wait cannot be lost", () => {
    const asking = reportScreen(ready(), { type: "asking" });
    expect(reportScreen(asking, { type: "preflighted", preflight: PREFLIGHT })).toBe(asking);
    expect(reportScreen(asking, { type: "cancel" })).toBe(asking);
  });

  it("names a failure in the key screen's words, and a session with nothing to assess apart", () => {
    const asking = reportScreen(ready(), { type: "asking" });
    expect(reportScreen(asking, { type: "failed", error: named("RateLimitError") })).toMatchObject({
      ask: { kind: "failed", failure: "out-of-credit" },
    });
    expect(reportScreen(asking, { type: "failed", error: new NothingToAssessError() })).toMatchObject({
      ask: { kind: "failed", failure: "nothing" },
    });
  });

  it("replaces the whole view when the report arrives", () => {
    const assessed = { ...REPORT, blocked: "assessed" as const };
    expect(reportScreen(reportScreen(ready(), { type: "asking" }), { type: "loaded", report: assessed })).toEqual({
      phase: "ready",
      report: assessed,
      ask: { kind: "idle" },
    });
  });

  it("ignores every step's action before the session has loaded", () => {
    expect(run({ type: "asking" })).toBe(INITIAL_REPORT);
    expect(run({ type: "loaded", report: null }, { type: "preflighted", preflight: PREFLIGHT })).toEqual({ phase: "not-found" });
  });
});

describe("askFailureMessage", () => {
  it("has a message for every failure", () => {
    expect(askFailureMessage("nothing")).toBe("failNothing");
    expect(askFailureMessage("out-of-credit")).toBe("fail_out-of-credit");
    expect(askFailureMessage("failed")).toBe("fail_failed");
  });
});

describe("the criteria and the drills (D124)", () => {
  it("lists the five criteria in the report's order", () => {
    expect(ORAL_CRITERION_ROWS.map((row) => row.key)).toEqual([
      "criterion_comprehension",
      "criterion_fluency",
      "criterion_grammar",
      "criterion_vocabulary",
      "criterion_task",
    ]);
  });

  it("drills a reading sub-skill in reading and a writing one in writing", () => {
    expect(drillHref("inference")).toBe("/practice/reading");
    expect(drillSkill("inference")).toBe("reading");
    expect(drillHref("agreement")).toBe("/practice/writing");
    expect(drillSkill("agreement")).toBe("writing");
  });
});

describe("transcriptRows", () => {
  const turn = (speaker: OralTurn["speaker"], text: string, input?: OralTurn["input"]): OralTurn => ({
    speaker,
    text,
    phase: 0,
    startMs: 0,
    endMs: 0,
    ...(input === undefined ? {} : { input }),
  });
  const TURNS = [
    turn("examiner", "Votre poste ?"),
    turn("candidate", "Je suis analyste et je gère des dossier.", "voice"),
    turn("examiner", "Un défi ?"),
    turn("candidate", "Les délais était courts.", "typed"),
  ];

  it("keeps an examiner's words as they were, and cuts each candidate turn at its own errors", () => {
    const rows = transcriptRows(TURNS, [
      { turn: 3, start: 11, end: 16, correction: "étaient", rule: "accord" },
      { turn: 1, start: 32, end: 39, correction: "dossiers", rule: "pluriel" },
    ]);

    expect(rows[0]).toEqual({ speaker: "examiner", index: 0, text: "Votre poste ?" });
    expect(rows[1]).toMatchObject({ speaker: "candidate", index: 1, typed: false });
    expect(rows[3]).toMatchObject({ speaker: "candidate", index: 3, typed: true });
    const marks = rows.flatMap((row) => (row.speaker === "candidate" ? row.segments.filter((s) => s.kind === "error") : []));
    expect(marks.map((m) => [m.text, m.number])).toEqual([
      ["dossier", 1],
      ["était", 2],
    ]);
  });

  it("gives a turn with no error one plain segment", () => {
    const [, row] = transcriptRows(TURNS, []);
    expect(row).toEqual({ speaker: "candidate", index: 1, typed: false, segments: [{ kind: "plain", text: TURNS[1]?.text }] });
  });
});

describe("fluencyWords", () => {
  it("says words a minute whole and the pause in tenths of a second", () => {
    expect(fluencyWords({ spokenTurns: 3, wordsPerMinute: 112.6, fillerCount: 4, meanPauseMs: 1_849 })).toEqual({
      measured: true,
      wordsPerMinute: 113,
      fillerCount: 4,
      pauseSeconds: 1.8,
      spokenTurns: 3,
    });
  });

  it("says nothing was measured when no answer was spoken", () => {
    expect(fluencyWords({ spokenTurns: 0, wordsPerMinute: null, fillerCount: null, meanPauseMs: null })).toEqual({
      measured: false,
      wordsPerMinute: null,
      fillerCount: null,
      pauseSeconds: null,
      spokenTurns: 0,
    });
  });
});

describe("costRows (D125, D127)", () => {
  const line = (usd: number, calls: number, unpriced = 0) => ({ usd, calls, unpriced });
  const words = (practice: ReturnType<typeof line>, report: ReturnType<typeof line>) =>
    costRows({ practice, report }, "en").map((row) => [row.label, row.words.key, row.words.values?.amount]);

  it("gives each line its amount, and the report's as not asked for when no report call was made", () => {
    expect(words(line(0.08, 5), line(0, 0))).toEqual([
      ["costPractice", "costExact", "US$0.08"],
      ["costReport", "costNoReport", undefined],
      ["costTotal", "costExact", "US$0.08"],
    ]);
  });

  it("shows a report call OpenAI billed though it failed, rather than 'not asked for'", () => {
    expect(words(line(0.08, 5), line(0.03, 1))[1]).toEqual(["costReport", "costExact", "US$0.03"]);
  });

  it("says under a cent for a figure under half a cent, and never 'at least under'", () => {
    expect(words(line(0.003, 1), line(0, 0))[0]).toEqual(["costPractice", "costUnderCent", "US$0.01"]);
    expect(words(line(0.003, 2, 1), line(0, 0))[0]).toEqual(["costPractice", "costFloorFraction", undefined]);
    expect(words(line(0, 1, 1), line(0, 0))[0]).toEqual(["costPractice", "costFloorFraction", undefined]);
  });

  it("marks each line with an unpriced call as a floor, and the total when any line is", () => {
    expect(words(line(0.08, 5, 1), line(0.02, 1))).toEqual([
      ["costPractice", "costFloor", "US$0.08"],
      ["costReport", "costExact", "US$0.02"],
      ["costTotal", "costFloor", "US$0.10"],
    ]);
  });
});

describe("the refusals and small choices, out of the .tsx (D127)", () => {
  it("maps a refusal before any call to its own words, and says it cannot be mended by asking again", () => {
    const asking = reportScreen(ready(), { type: "asking" });
    const failure = (error: unknown) => {
      const next = reportScreen(asking, { type: "failed", error });
      return next.phase === "ready" && next.ask.kind === "failed" ? next.ask.failure : null;
    };
    expect(failure(new OralSessionRunningError(sessionId("s")))).toBe("running");
    expect(failure(new UnknownScenarioError(scenarioId("gone")))).toBe("scenario-gone");
    expect(failure(new UnknownOralSessionError(sessionId("s")))).toBe("gone");
    expect(askFailureMessage("scenario-gone")).toBe("fail_scenario-gone");
    expect(["nothing", "running", "scenario-gone", "gone"].map((f) => canRetry(f as never))).toEqual([false, false, false, false]);
    expect(canRetry("timeout")).toBe(true);
  });

  it("names why a report cannot be asked for, and nothing when it can or already was", () => {
    expect(blockMessage("running")).toBe("stillRunning");
    expect(blockMessage("no-answer")).toBe("nothingToAssess");
    expect(blockMessage("scenario-gone")).toBe("scenarioGone");
    expect(blockMessage("assessed")).toBeNull();
    expect(blockMessage(null)).toBeNull();
  });

  it("links a session's end to its report only when it was stored, ended, with an answer", () => {
    const answered: OralSession = {
      ...REPORT.session,
      turns: [{ speaker: "candidate", text: "Oui.", phase: 0, startMs: 0, endMs: 0 }],
    };
    expect(endReportLink(answered)).toBe(true);
    expect(endReportLink({ ...answered, endReason: null })).toBe(false);
    expect(endReportLink({ ...answered, turns: [] })).toBe(false);
    expect(endReportLink(null)).toBe(false);
  });

  it("writes the report in the interface's language, and names each fix's drill", () => {
    expect(feedbackLangFor("fr")).toBe("fr");
    expect(feedbackLangFor("en")).toBe("en");
    expect(drillMessage("inference")).toBe("drillReading");
    expect(drillMessage("agreement")).toBe("drillWriting");
  });

  it("refreshes the session while keeping a failure on screen, and says a read failure is not a missing session", () => {
    const failed = reportScreen(reportScreen(ready(), { type: "asking" }), { type: "failed", error: named("TimeoutError") });
    const billed = { ...REPORT, cost: { ...REPORT.cost, report: { usd: 0.03, calls: 1, unpriced: 0 } } };
    expect(reportScreen(failed, { type: "refreshed", report: billed })).toMatchObject({ report: billed, ask: { kind: "failed" } });
    expect(reportScreen(ready(), { type: "loadFailed" })).toEqual({ phase: "load-failed" });
    expect(reportScreen(INITIAL_REPORT, { type: "refreshed", report: billed })).toBe(INITIAL_REPORT);
  });
});

describe("historyTag", () => {
  it("names a past session with a report, one without, and one with nothing said", () => {
    expect(historyTag({ assessed: true, answered: true })).toBe("historyAssessed");
    expect(historyTag({ assessed: false, answered: true })).toBe("historyUnassessed");
    expect(historyTag({ assessed: false, answered: false })).toBe("historyNothing");
  });
});
