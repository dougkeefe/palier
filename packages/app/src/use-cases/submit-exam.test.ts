import type { ItemId, OptionId } from "@palier/domain";
import { formId, itemId } from "@palier/domain";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { ExamAnswer, ExamRun, ExamRunStore } from "../ports/index.js";
import { UnknownExamRunError, UnknownFormError } from "./exam-run.js";
import {
  ExamNotSubmittedError,
  type SubmitExamDeps,
  examAttemptId,
  rescoreExam,
  submitExam,
} from "./submit-exam.js";
import { ITEM_IDS, PILOTS, RUN_ID, aRun, clockOf, itemsOf, profile } from "./__tests__/exam-fakes.js";
import { attemptStore, examRunStore, scheduleStore } from "./__tests__/sync-fakes.js";

// Local stubs rather than @palier/testing (progress.md D37).

const SUBMIT_AT = "2026-03-01T09:40:00.000Z";

const anAnswer = (id: string, response: OptionId, changedAnswer = false): ExamAnswer => ({
  itemId: itemId(id),
  response,
  msToFirstSelect: 700,
  msToConfirm: 1_100,
  changedAnswer,
});

const depsHolding = (run: ExamRun, over: Partial<SubmitExamDeps> = {}): SubmitExamDeps => ({
  clock: clockOf(SUBMIT_AT),
  items: itemsOf(),
  examRuns: examRunStore([run]),
  attempts: attemptStore(),
  schedule: scheduleStore(),
  profile,
  ...over,
});

/** q1 right, q2 wrong, q3 right but wavering, p1 wrong (a pilot); q4 and p2 unanswered. */
const ANSWERED = aRun({
  elapsedMs: 30 * 60_000,
  answers: [anAnswer("q1", "a"), anAnswer("q2", "b"), anAnswer("q3", "a", true), anAnswer("p1", "c")],
});

describe("submitExam", () => {
  it("records one exam attempt per answered item, keyed by run and item, stamped at submission", async () => {
    const deps = depsHolding(ANSWERED);

    await submitExam({ runId: RUN_ID, elapsedMs: 31 * 60_000 }, deps);

    const attempts = await deps.attempts.all();
    expect(attempts.map((a) => a.id).sort()).toEqual(
      ["q1", "q2", "q3", "p1"].map((id) => examAttemptId(RUN_ID, itemId(id))).sort(),
    );
    for (const attempt of attempts) {
      expect(attempt).toMatchObject({ mode: "exam", sessionId: RUN_ID, ts: SUBMIT_AT, bankVersion: 3 });
    }
    expect(attempts.find((a) => a.itemId === "q3")).toMatchObject({ chosen: "a", correct: true, changedAnswer: true });
  });

  it("records no attempt for an unanswered item", async () => {
    const deps = depsHolding(ANSWERED);

    await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);

    const recorded = (await deps.attempts.all()).map((a) => a.itemId);
    expect(recorded).not.toContain("q4");
    expect(recorded).not.toContain("p2");
  });

  it("stamps submittedAt once, keeps the later elapsed time, and stores the closed run", async () => {
    const deps = depsHolding(ANSWERED);

    const { run } = await submitExam({ runId: RUN_ID, elapsedMs: 31 * 60_000 }, deps);

    expect(run).toEqual({ ...ANSWERED, elapsedMs: 31 * 60_000, checkpointedAt: SUBMIT_AT, submittedAt: SUBMIT_AT });
    expect(await deps.examRuns.get(RUN_ID)).toEqual(run);
  });

  it("scores the scored items only: pilots never touch the raw score", async () => {
    const { result } = await submitExam({ runId: RUN_ID, elapsedMs: 0 }, depsHolding(ANSWERED));

    // q1 and q3 are right; the pilot p1 is wrong and would not count either way.
    expect(result.outcome).toMatchObject({ raw: 2, scored: 4, band: "A" });
    expect(result.items.find((line) => line.itemId === "p1")).toMatchObject({ pilot: true, correct: false });
  });

  it("schedules wrong and wavering scored answers, and leaves a right, unwavering one out of the queue", async () => {
    const deps = depsHolding(ANSWERED);

    await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);

    expect(await deps.schedule.get(itemId("q2"))).not.toBeNull();
    expect(await deps.schedule.get(itemId("q3"))).not.toBeNull();
    expect(await deps.schedule.get(itemId("q1"))).toBeNull();
  });

  it("never schedules a pilot item, even one answered wrongly", async () => {
    const deps = depsHolding(ANSWERED);

    await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);

    expect(await deps.schedule.get(itemId("p1"))).toBeNull();
    expect((await deps.attempts.all()).some((a) => a.itemId === "p1")).toBe(true);
  });

  it("is idempotent on retry: no second attempt, no second Leitner move, the first submittedAt kept", async () => {
    const deps = depsHolding(ANSWERED);
    const first = await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);
    const scheduleAfterFirst = await deps.schedule.all();

    const again = await submitExam(
      { runId: RUN_ID, elapsedMs: 99 * 60_000 },
      { ...deps, clock: clockOf("2026-03-02T00:00:00.000Z") },
    );

    expect(await deps.attempts.all()).toHaveLength(4);
    expect(await deps.schedule.all()).toEqual(scheduleAfterFirst);
    expect(again).toEqual(first);
  });

  it("finishes the job after dying between the attempts and the stamp", async () => {
    const runs = examRunStore([ANSWERED]);
    let failNext = true;
    const flaky: ExamRunStore = {
      ...runs,
      put: (run) => {
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error("tab closed"));
        }
        return runs.put(run);
      },
    };
    const deps = depsHolding(ANSWERED, { examRuns: flaky });
    await expect(submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps)).rejects.toThrow("tab closed");
    const scheduleAfterCrash = await deps.schedule.all();

    const { run } = await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);

    expect(run.submittedAt).toBe(SUBMIT_AT);
    expect(await deps.attempts.all()).toHaveLength(4);
    expect(await deps.schedule.all()).toEqual(scheduleAfterCrash);
  });

  it("records the attempts of a run submitted elsewhere and keeps that device's submittedAt", async () => {
    const synced = { ...ANSWERED, submittedAt: "2026-03-01T09:35:00.000Z" };
    const deps = depsHolding(synced);

    const { run } = await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);

    expect(run).toEqual(synced);
    expect(await deps.attempts.all()).toHaveLength(4);
  });

  it("throws UnknownExamRunError when the run does not exist", async () => {
    const deps = depsHolding(ANSWERED, { examRuns: examRunStore() });

    await expect(submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps)).rejects.toThrow(UnknownExamRunError);
  });

  it("throws UnknownFormError and records nothing when the run's form has left the bank", async () => {
    const deps = depsHolding(aRun({ formId: formId("gone"), answers: ANSWERED.answers }));

    await expect(submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps)).rejects.toThrow(UnknownFormError);
    expect(await deps.attempts.all()).toEqual([]);
  });
});

describe("rescoreExam", () => {
  it("returns the same result submitExam did", async () => {
    const deps = depsHolding(ANSWERED);
    const { result } = await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);

    expect(await rescoreExam({ runId: RUN_ID }, deps)).toEqual(result);
  });

  it("throws ExamNotSubmittedError, naming the run, for a run still in progress", async () => {
    const error = await rescoreExam({ runId: RUN_ID }, depsHolding(ANSWERED)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ExamNotSubmittedError);
    expect((error as ExamNotSubmittedError).runId).toBe(RUN_ID);
  });

  it("throws UnknownExamRunError when the run does not exist", async () => {
    await expect(rescoreExam({ runId: RUN_ID }, depsHolding(ANSWERED, { examRuns: examRunStore() }))).rejects.toThrow(
      UnknownExamRunError,
    );
  });
});

/**
 * Phase 3 exit criterion 4: "rescoring a stored run produces an identical
 * result". Over any set of answers, submit, rescore and rescore again agree, and
 * every attempt the submit recorded agrees with the result about its item.
 */
describe("scoring is idempotent (property)", () => {
  const answersArb = fc
    .subarray([...ITEM_IDS])
    .chain((ids) =>
      fc.tuple(
        ...ids.map((id) =>
          fc.record({
            itemId: fc.constant<ItemId>(id),
            response: fc.constantFrom<OptionId>("a", "b", "c", "d"),
            msToFirstSelect: fc.nat(60_000),
            msToConfirm: fc.nat(60_000),
            changedAnswer: fc.boolean(),
          }),
        ),
      ),
    );

  it("gives the same result on submit, rescore and a second rescore, matching the attempts", async () => {
    await fc.assert(
      fc.asyncProperty(answersArb, async (answers) => {
        const deps = depsHolding(aRun({ answers }));

        const { result } = await submitExam({ runId: RUN_ID, elapsedMs: 0 }, deps);
        const once = await rescoreExam({ runId: RUN_ID }, deps);
        const twice = await rescoreExam({ runId: RUN_ID }, deps);

        expect(once).toEqual(result);
        expect(twice).toEqual(result);

        const attempts = await deps.attempts.all();
        expect(attempts).toHaveLength(answers.length);
        for (const attempt of attempts) {
          expect(result.items.find((line) => line.itemId === attempt.itemId)?.correct).toBe(attempt.correct);
        }
        const pilots = new Set<ItemId>(PILOTS);
        expect(result.outcome.raw).toBe(
          answers.filter((a) => !pilots.has(a.itemId) && a.response === "a").length,
        );
      }),
    );
  });
});
