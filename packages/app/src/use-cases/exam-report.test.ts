import { formId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import type { ExamAnswer, ExamRun } from "../ports/index.js";
import { UnknownItemError } from "./answer-item.js";
import { UnknownExamRunError } from "./exam-run.js";
import { examForms, examReport, latestExamResult, queueForReview } from "./exam-report.js";
import { ExamNotSubmittedError } from "./submit-exam.js";
import { BANK, FORM, ITEM_IDS, NOW, RUN_ID, aRun, clockOf, itemsOf, profile } from "./__tests__/exam-fakes.js";
import { examRunStore, scheduleStore } from "./__tests__/sync-fakes.js";

// Local stubs rather than @palier/testing (progress.md D37).

const SUBMITTED = "2026-03-01T10:00:00.000Z";
const LATER = "2026-03-02T10:00:00.000Z";
const Q1 = itemId("q1");

const answerOf = (id: string, response: "a" | "b"): ExamAnswer => ({
  itemId: itemId(id),
  response,
  msToFirstSelect: 1,
  msToConfirm: 2,
  changedAnswer: false,
  answeredAt: NOW,
});

/** q1 and q2 right, q3 wrong, q4 unanswered: raw 2 of 4, band A. */
const submitted = (over: Partial<ExamRun> = {}): ExamRun =>
  aRun({
    answers: [answerOf("q1", "a"), answerOf("q2", "a"), answerOf("q3", "b")],
    submittedAt: SUBMITTED,
    ...over,
  });

const deps = (runs: readonly ExamRun[]) => ({
  items: itemsOf(),
  examRuns: examRunStore(runs),
});

describe("examReport", () => {
  it("rescores the run and returns it with its form and the form's items in form order", async () => {
    const report = await examReport({ runId: RUN_ID }, deps([submitted()]));

    expect(report.run).toEqual(submitted());
    expect(report.form).toBe(FORM);
    expect(report.items.map((i) => i.id)).toEqual(ITEM_IDS);
    expect(report.result.outcome).toMatchObject({ band: "A", raw: 2, scored: 4 });
  });

  it("says nothing about the review queue, which would single out wrong pilots (D89)", async () => {
    const report = await examReport({ runId: RUN_ID }, deps([submitted()]));

    expect(Object.keys(report).sort()).toEqual(["form", "items", "result", "retake", "run"]);
  });

  it("is not a retake when no other run on the form was submitted first", async () => {
    const later = submitted({ id: sessionId("later"), submittedAt: LATER });
    const otherForm = submitted({ id: sessionId("other"), formId: formId("other-form"), submittedAt: NOW });
    const unfinished = aRun({ id: sessionId("open") });

    const report = await examReport({ runId: RUN_ID }, deps([submitted(), later, otherForm, unfinished]));

    expect(report.retake).toBe(false);
  });

  it("is a retake when another run on the same form was submitted earlier", async () => {
    const first = submitted({ id: sessionId("first"), submittedAt: NOW });

    const report = await examReport({ runId: RUN_ID }, deps([first, submitted()]));

    expect(report.retake).toBe(true);
  });

  it("breaks a tie in submission instant by run id, so exactly one of two such runs is the retake", async () => {
    const a = submitted({ id: sessionId("a") });
    const b = submitted({ id: sessionId("b") });
    const d = deps([a, b]);

    expect((await examReport({ runId: sessionId("a") }, d)).retake).toBe(false);
    expect((await examReport({ runId: sessionId("b") }, d)).retake).toBe(true);
  });

  it("throws ExamNotSubmittedError for a run still in progress", async () => {
    await expect(examReport({ runId: RUN_ID }, deps([aRun()]))).rejects.toThrow(ExamNotSubmittedError);
  });

  it("throws UnknownExamRunError for a run it does not hold", async () => {
    await expect(examReport({ runId: RUN_ID }, deps([]))).rejects.toThrow(UnknownExamRunError);
  });
});

describe("latestExamResult", () => {
  it("returns null when no run has been submitted", async () => {
    expect(await latestExamResult(deps([aRun()]))).toBeNull();
  });

  it("returns the most recently submitted run, rescored with its form", async () => {
    const earlier = submitted({ id: sessionId("earlier"), submittedAt: NOW, answers: [] });
    const latest = submitted({ id: sessionId("latest"), submittedAt: LATER });

    const found = await latestExamResult(deps([latest, earlier, aRun({ id: sessionId("open") })]));

    expect(found?.run.id).toBe("latest");
    expect(found?.form).toBe(FORM);
    expect(found?.result.outcome.raw).toBe(2);
  });

  it("takes the higher id of two runs submitted at the same instant", async () => {
    const found = await latestExamResult(
      deps([submitted({ id: sessionId("b") }), submitted({ id: sessionId("c") }), submitted({ id: sessionId("a") })]),
    );

    expect(found?.run.id).toBe("c");
  });

  it("passes over a run whose form has left the bank", async () => {
    const gone = submitted({ id: sessionId("gone"), formId: formId("gone"), submittedAt: LATER });

    const found = await latestExamResult(deps([gone, submitted()]));

    expect(found?.run.id).toBe(RUN_ID);
  });

  it("passes over a run whose form is present but an item has left the bank, rather than failing (D89)", async () => {
    const shrunk = { items: itemsOf([FORM], BANK.slice(1)), examRuns: examRunStore([submitted()]) };

    expect(await latestExamResult(shrunk)).toBeNull();
  });

  it("returns null when every submitted run's form has left the bank", async () => {
    expect(await latestExamResult(deps([submitted({ formId: formId("gone") })]))).toBeNull();
  });
});

describe("examForms", () => {
  it("lists the bank's forms", async () => {
    expect(await examForms({ items: itemsOf() })).toEqual([FORM]);
  });
});

describe("queueForReview", () => {
  const queueDeps = (schedule = scheduleStore()) => ({
    clock: clockOf(NOW),
    items: itemsOf(),
    schedule,
    profile,
  });

  it("queues an item at box 1, due after the profile's first interval, as a wrong answer would be", async () => {
    const d = queueDeps();

    expect(await queueForReview({ itemId: Q1 }, d)).toBe(true);
    expect(await d.schedule.get(Q1)).toEqual({
      itemId: Q1,
      due: "2026-03-02T09:00:00.000Z",
      skill: "reading",
      box: 1,
    });
  });

  it("leaves an item already queued alone, so a second tap cannot reset its box", async () => {
    const schedule = scheduleStore();
    const entry = { itemId: Q1, due: LATER, skill: "reading" as const, box: 3 };
    await schedule.put(entry);

    expect(await queueForReview({ itemId: Q1 }, queueDeps(schedule))).toBe(false);
    expect(await schedule.get(Q1)).toEqual(entry);
  });

  it("reopens a retired item at box 1", async () => {
    const schedule = scheduleStore();
    await schedule.put({ itemId: Q1, due: null, skill: "reading", box: 5 });

    expect(await queueForReview({ itemId: Q1 }, queueDeps(schedule))).toBe(true);
    expect((await schedule.get(Q1))?.box).toBe(1);
  });

  it("throws UnknownItemError for an item the bank does not hold", async () => {
    await expect(queueForReview({ itemId: itemId("absent") }, queueDeps())).rejects.toThrow(UnknownItemError);
  });
});
