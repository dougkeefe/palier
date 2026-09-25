import { formId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import type { ExamRunDeps } from "./exam-run.js";
import {
  ExamAlreadySubmittedError,
  ExamItemNotOnFormError,
  UnknownExamRunError,
  UnknownFormError,
  answerExamItem,
  checkpointExam,
  flagExamItem,
  examInProgress,
  laterElapsed,
  resumeExam,
  runLimitMs,
  startExam,
} from "./exam-run.js";
import { FORM, FORM_ID, NOW, RUN_ID, aRun, clockOf, itemsOf } from "./__tests__/exam-fakes.js";
import { examRunStore } from "./__tests__/sync-fakes.js";

// Local stubs rather than @palier/testing (progress.md D37).

const LATER = "2026-03-01T09:10:00.000Z";
const Q1 = itemId("q1");
const Q2 = itemId("q2");

const depsWith = (over: Partial<ExamRunDeps> = {}): ExamRunDeps => ({
  clock: clockOf(NOW),
  items: itemsOf(),
  examRuns: examRunStore(),
  ...over,
});

/** Deps holding one stored run, for the use cases that need one to exist. */
const depsHolding = (run = aRun(), clock = clockOf(LATER)): ExamRunDeps =>
  depsWith({ clock, examRuns: examRunStore([run]) });

const answer = (over: Partial<Parameters<typeof answerExamItem>[0]> = {}) => ({
  runId: RUN_ID,
  itemId: Q1,
  response: "a" as const,
  msToFirstSelect: 800,
  msToConfirm: 1_200,
  changedAnswer: false,
  elapsedMs: 60_000,
  ...over,
});

describe("startExam", () => {
  it("opens an empty, in-progress run on the form, stamped from the clock, and stores it", async () => {
    const deps = depsWith();

    const { run, form } = await startExam({ runId: RUN_ID, formId: FORM_ID }, deps);

    expect(form).toBe(FORM);
    expect(run).toEqual(aRun({ startedAt: NOW, checkpointedAt: NOW }));
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("throws UnknownFormError, naming the form, when the form is not in the bank", async () => {
    const missing = formId("no-such-form");

    const error = await startExam({ runId: RUN_ID, formId: missing }, depsWith()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownFormError);
    expect((error as UnknownFormError).formId).toBe(missing);
  });

  it("returns the stored run on a retried start instead of resetting its answers", async () => {
    const answered = aRun({
      elapsedMs: 90_000,
      answers: [{ itemId: Q1, response: "a", msToFirstSelect: 1, msToConfirm: 2, changedAnswer: false, answeredAt: NOW }],
    });
    const deps = depsHolding(answered);

    const { run } = await startExam({ runId: RUN_ID, formId: FORM_ID }, deps);

    expect(run).toEqual(answered);
    expect(await deps.examRuns.get(RUN_ID)).toEqual(answered);
  });
});

describe("startExam with a time allowance", () => {
  it("stores an allowance above 1 on the run", async () => {
    const deps = depsWith();

    const { run } = await startExam({ runId: RUN_ID, formId: FORM_ID, timeAllowance: 1.5 }, deps);

    expect(run.timeAllowance).toBe(1.5);
    expect((await deps.examRuns.get(RUN_ID))?.timeAllowance).toBe(1.5);
  });

  it("leaves the default allowance of 1 unwritten, so the run is the one written before allowances existed", async () => {
    const { run } = await startExam({ runId: RUN_ID, formId: FORM_ID, timeAllowance: 1 }, depsWith());

    expect(run).toEqual(aRun());
    expect(run).not.toHaveProperty("timeAllowance");
  });

  it.each([0.5, 0, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws a RangeError for an allowance of %s, and stores nothing",
    async (bad) => {
      const deps = depsWith();

      await expect(startExam({ runId: RUN_ID, formId: FORM_ID, timeAllowance: bad }, deps)).rejects.toThrow(RangeError);
      expect(await deps.examRuns.get(RUN_ID)).toBeNull();
    },
  );
});

describe("runLimitMs", () => {
  it("is the form's limit, stretched by the run's allowance when it has one", () => {
    expect(runLimitMs(aRun(), FORM)).toBe(45 * 60_000);
    expect(runLimitMs(aRun({ timeAllowance: 1.5 }), FORM)).toBe(67.5 * 60_000);
  });
});

describe("answerExamItem", () => {
  it("records the answer and checkpoints the elapsed time and instant in the same write", async () => {
    const deps = depsHolding();

    const run = await answerExamItem(answer({ elapsedMs: 75_000 }), deps);

    expect(run.answers).toEqual([
      { itemId: Q1, response: "a", msToFirstSelect: 800, msToConfirm: 1_200, changedAnswer: false, answeredAt: LATER },
    ]);
    expect(run.elapsedMs).toBe(75_000);
    expect(run.checkpointedAt).toBe(LATER);
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("replaces an earlier answer to the same item in place, keeping one answer per item", async () => {
    const deps = depsHolding();
    await answerExamItem(answer({ itemId: Q1, response: "b" }), deps);
    await answerExamItem(answer({ itemId: Q2, response: "a" }), deps);

    const run = await answerExamItem(answer({ itemId: Q1, response: "c" }), deps);

    expect(run.answers.map((a) => [a.itemId, a.response])).toEqual([
      ["q1", "c"],
      ["q2", "a"],
    ]);
  });

  it("marks the answer changed when it differs from the item's earlier answer", async () => {
    const deps = depsHolding();
    await answerExamItem(answer({ response: "b" }), deps);

    const run = await answerExamItem(answer({ response: "a" }), deps);

    expect(run.answers[0]?.changedAnswer).toBe(true);
  });

  it("keeps an answer changed once it has wavered, even on settling back on the first choice", async () => {
    const deps = depsHolding();
    await answerExamItem(answer({ response: "a", changedAnswer: true }), deps);

    const run = await answerExamItem(answer({ response: "a", changedAnswer: false }), deps);

    expect(run.answers[0]?.changedAnswer).toBe(true);
  });

  it("does not mark an unwavering re-confirmation of the same answer as changed", async () => {
    const deps = depsHolding();
    await answerExamItem(answer({ response: "a" }), deps);

    const run = await answerExamItem(answer({ response: "a" }), deps);

    expect(run.answers[0]?.changedAnswer).toBe(false);
  });

  it("carries the request's own changedAnswer on a first answer", async () => {
    const run = await answerExamItem(answer({ changedAnswer: true }), depsHolding());

    expect(run.answers[0]?.changedAnswer).toBe(true);
  });

  it("never lets the elapsed time go backwards", async () => {
    const deps = depsHolding(aRun({ elapsedMs: 120_000 }));

    const run = await answerExamItem(answer({ elapsedMs: 30_000 }), deps);

    expect(run.elapsedMs).toBe(120_000);
  });

  it("throws ExamItemNotOnFormError, naming the run and item, for an item the form does not hold", async () => {
    const stray = itemId("not-on-form");

    const error = await answerExamItem(answer({ itemId: stray }), depsHolding()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ExamItemNotOnFormError);
    expect((error as ExamItemNotOnFormError).runId).toBe(RUN_ID);
    expect((error as ExamItemNotOnFormError).itemId).toBe(stray);
  });

  it("throws UnknownExamRunError, naming the run, when the run does not exist", async () => {
    const error = await answerExamItem(answer(), depsWith()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownExamRunError);
    expect((error as UnknownExamRunError).runId).toBe(RUN_ID);
  });

  it("throws ExamAlreadySubmittedError and leaves a submitted run untouched", async () => {
    const submitted = aRun({ submittedAt: NOW });
    const deps = depsHolding(submitted);

    const error = await answerExamItem(answer(), deps).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ExamAlreadySubmittedError);
    expect((error as ExamAlreadySubmittedError).runId).toBe(RUN_ID);
    expect(await deps.examRuns.get(RUN_ID)).toEqual(submitted);
  });

  it("throws UnknownFormError when the run's form has left the bank", async () => {
    const deps = depsHolding(aRun({ formId: formId("gone") }));

    await expect(answerExamItem(answer(), deps)).rejects.toThrow(UnknownFormError);
  });
});

describe("flagExamItem", () => {
  it("flags an item and checkpoints in the same write", async () => {
    const deps = depsHolding();

    const run = await flagExamItem({ runId: RUN_ID, itemId: Q2, flagged: true, elapsedMs: 5_000 }, deps);

    expect(run.flagged).toEqual([Q2]);
    expect(run.elapsedMs).toBe(5_000);
    expect(run.checkpointedAt).toBe(LATER);
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("clears a flag", async () => {
    const deps = depsHolding(aRun({ flagged: [Q1, Q2] }));

    const run = await flagExamItem({ runId: RUN_ID, itemId: Q1, flagged: false, elapsedMs: 0 }, deps);

    expect(run.flagged).toEqual([Q2]);
  });

  it("lands in the same state when a flag is retried, holding each item once", async () => {
    const deps = depsHolding();
    await flagExamItem({ runId: RUN_ID, itemId: Q1, flagged: true, elapsedMs: 0 }, deps);

    const run = await flagExamItem({ runId: RUN_ID, itemId: Q1, flagged: true, elapsedMs: 0 }, deps);

    expect(run.flagged).toEqual([Q1]);
  });

  it("throws ExamItemNotOnFormError for an item the form does not hold", async () => {
    await expect(
      flagExamItem({ runId: RUN_ID, itemId: itemId("stray"), flagged: true, elapsedMs: 0 }, depsHolding()),
    ).rejects.toThrow(ExamItemNotOnFormError);
  });

  it("throws ExamAlreadySubmittedError on a submitted run", async () => {
    await expect(
      flagExamItem({ runId: RUN_ID, itemId: Q1, flagged: true, elapsedMs: 0 }, depsHolding(aRun({ submittedAt: NOW }))),
    ).rejects.toThrow(ExamAlreadySubmittedError);
  });
});

describe("checkpointExam", () => {
  it("persists the elapsed time and the instant, changing nothing else", async () => {
    const before = aRun({ flagged: [Q1], elapsedMs: 10_000 });
    const deps = depsHolding(before);

    const run = await checkpointExam({ runId: RUN_ID, elapsedMs: 42_000 }, deps);

    expect(run).toEqual({ ...before, elapsedMs: 42_000, checkpointedAt: LATER });
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("keeps the stored elapsed time when a stale tab reports less", async () => {
    const run = await checkpointExam({ runId: RUN_ID, elapsedMs: 1_000 }, depsHolding(aRun({ elapsedMs: 9_000 })));

    expect(run.elapsedMs).toBe(9_000);
  });

  it("throws UnknownExamRunError when the run does not exist", async () => {
    await expect(checkpointExam({ runId: RUN_ID, elapsedMs: 0 }, depsWith())).rejects.toThrow(UnknownExamRunError);
  });

  it("throws ExamAlreadySubmittedError on a submitted run", async () => {
    await expect(
      checkpointExam({ runId: RUN_ID, elapsedMs: 0 }, depsHolding(aRun({ submittedAt: NOW }))),
    ).rejects.toThrow(ExamAlreadySubmittedError);
  });
});

describe("laterElapsed", () => {
  it("takes the larger of the stored and reported times", () => {
    expect(laterElapsed(5, 9)).toBe(9);
    expect(laterElapsed(9, 5)).toBe(9);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])("throws a RangeError for a reported %s", (bad) => {
    expect(() => laterElapsed(0, bad)).toThrow(RangeError);
  });
});

describe("resumeExam", () => {
  it("resumes the latest unsubmitted run when no id is given, with the time left from elapsed time", async () => {
    const run = aRun({ elapsedMs: 10 * 60_000 });

    const resumed = await resumeExam({}, depsHolding(run));

    expect(resumed).toEqual({
      run: { ...run, resumes: 1, checkpointedAt: LATER },
      form: FORM,
      remainingMs: 35 * 60_000,
    });
  });

  it("counts a resume after exam time has run as a pause, and stores the count with a checkpoint", async () => {
    const deps = depsHolding(aRun({ elapsedMs: 60_000, resumes: 2 }));

    const resumed = await resumeExam({ runId: RUN_ID }, deps);

    expect(resumed?.run.resumes).toBe(3);
    expect(await deps.examRuns.get(RUN_ID)).toEqual(resumed?.run);
  });

  it("does not count opening a run whose clock has not started, and writes nothing", async () => {
    const run = aRun();
    const deps = depsHolding(run);

    const resumed = await resumeExam({ runId: RUN_ID }, deps);

    expect(resumed?.run).toEqual(run);
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("gives the time left with the run's extra time", async () => {
    const resumed = await resumeExam({}, depsHolding(aRun({ elapsedMs: 50 * 60_000, timeAllowance: 1.5 })));

    expect(resumed?.remainingMs).toBe(17.5 * 60_000);
  });

  it("returns null when there is nothing to resume", async () => {
    expect(await resumeExam({}, depsWith())).toBeNull();
  });

  it("resumes a named run", async () => {
    const other = aRun({ id: sessionId("other"), startedAt: "2026-03-02T00:00:00.000Z" });
    const deps = depsWith({ examRuns: examRunStore([aRun(), other]) });

    const resumed = await resumeExam({ runId: RUN_ID }, deps);

    expect(resumed?.run.id).toBe(RUN_ID);
  });

  it("never reports negative time left for a run past its limit", async () => {
    const resumed = await resumeExam({}, depsHolding(aRun({ elapsedMs: 50 * 60_000 })));

    expect(resumed?.remainingMs).toBe(0);
  });

  it("throws ExamAlreadySubmittedError when the named run is submitted", async () => {
    await expect(resumeExam({ runId: RUN_ID }, depsHolding(aRun({ submittedAt: NOW })))).rejects.toThrow(
      ExamAlreadySubmittedError,
    );
  });

  it("throws UnknownExamRunError when the named run does not exist", async () => {
    await expect(resumeExam({ runId: RUN_ID }, depsWith())).rejects.toThrow(UnknownExamRunError);
  });

  it("throws UnknownFormError when the run's form has left the bank", async () => {
    await expect(resumeExam({}, depsHolding(aRun({ formId: formId("gone") })))).rejects.toThrow(UnknownFormError);
  });
});

describe("examInProgress", () => {
  it("finds the latest unsubmitted run with its time left, and writes nothing, so looking is not a pause", async () => {
    const run = aRun({ elapsedMs: 10 * 60_000 });
    const deps = depsHolding(run);

    expect(await examInProgress(deps)).toEqual({ run, form: FORM, remainingMs: 35 * 60_000 });
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("returns null when nothing is in progress", async () => {
    expect(await examInProgress(depsWith())).toBeNull();
  });
});
