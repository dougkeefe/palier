import type { TelemetryEvent } from "@palier/domain";
import { TELEMETRY_MAX_RESPONSE_MS, itemId } from "@palier/domain";
import { scoreExam } from "@palier/engine";
import { describe, expect, it } from "vitest";

import type { ExamAnswer, ExamRun } from "../ports/index.js";
import { TELEMETRY_MAX_BATCH, TelemetryRejectedError, TelemetryUnavailableError } from "../ports/index.js";
import { examTelemetryEvents } from "./exam-telemetry-events.js";
import { UnknownExamRunError } from "./exam-run.js";
import { ExamNotSubmittedError } from "./submit-exam.js";
import {
  flushTelemetry,
  recordExamTelemetry,
  setTelemetryConsent,
  telemetryConsent,
} from "./telemetry.js";
import { BANK, FORM, RUN_ID, aRun, itemsOf } from "./__tests__/exam-fakes.js";
import { examRunStore } from "./__tests__/sync-fakes.js";
import { sinkOf, telemetryStore } from "./__tests__/telemetry-fakes.js";

// Local stubs rather than @palier/testing (progress.md D37).

const SUBMITTED_AT = "2026-03-01T09:40:00.000Z";

const anAnswer = (id: string, response: ExamAnswer["response"], msToConfirm = 1_100): ExamAnswer => ({
  itemId: itemId(id),
  response,
  msToFirstSelect: 700,
  msToConfirm,
  changedAnswer: false,
  answeredAt: "2026-03-01T09:20:00.000Z",
});

/** q1 right, q2 wrong, q3 right, p1 wrong (a pilot); q4 and p2 unanswered. Two of four scored right. */
const SUBMITTED = aRun({
  answers: [anAnswer("q1", "a"), anAnswer("q2", "b"), anAnswer("q3", "a"), anAnswer("p1", "c")],
  submittedAt: SUBMITTED_AT,
});

const resultOf = (run: ExamRun) =>
  scoreExam(FORM, BANK, new Map(run.answers.map((a) => [a.itemId, a.response])));

const anEvent = (id: string, over: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
  itemId: itemId(id),
  correct: true,
  responseMs: 1_000,
  bankVersion: 3,
  restBucket: 2,
  ...over,
});

describe("examTelemetryEvents", () => {
  it("gives one event per answered item, pilots included, in the order answered", () => {
    expect(examTelemetryEvents(SUBMITTED, resultOf(SUBMITTED), 3)).toEqual([
      // A scored item's rest is the other three scored items; q4, unanswered, counts wrong.
      { itemId: "q1", correct: true, responseMs: 1_100, bankVersion: 3, restBucket: 1 }, // 1 of 3
      { itemId: "q2", correct: false, responseMs: 1_100, bankVersion: 3, restBucket: 3 }, // 2 of 3
      { itemId: "q3", correct: true, responseMs: 1_100, bankVersion: 3, restBucket: 1 }, // 1 of 3
      // A pilot's rest is all four scored items.
      { itemId: "p1", correct: false, responseMs: 1_100, bankVersion: 3, restBucket: 2 }, // 2 of 4
    ]);
  });

  it("carries only the five fields, and nothing that names the run or the device", () => {
    for (const event of examTelemetryEvents(SUBMITTED, resultOf(SUBMITTED), 3)) {
      expect(Object.keys(event).sort()).toEqual(["bankVersion", "correct", "itemId", "responseMs", "restBucket"]);
    }
  });

  it("sends a response time as a whole number inside the wire's bounds", () => {
    const run = aRun({
      answers: [anAnswer("q1", "a", 1_234.6), anAnswer("q2", "a", -5), anAnswer("q3", "a", TELEMETRY_MAX_RESPONSE_MS * 2)],
    });
    expect(examTelemetryEvents(run, resultOf(run), 3).map((e) => e.responseMs)).toEqual([
      1_235,
      0,
      TELEMETRY_MAX_RESPONSE_MS,
    ]);
  });

  it("passes over an answer to an item the form does not hold", () => {
    const run = aRun({ answers: [anAnswer("q1", "a"), anAnswer("stray", "a")] });
    expect(examTelemetryEvents(run, resultOf(run), 3).map((e) => e.itemId)).toEqual(["q1"]);
  });
});

const depsWith = (run: ExamRun | null, consent: Parameters<typeof telemetryStore>[0] = "unasked") => ({
  items: itemsOf(),
  examRuns: examRunStore(run === null ? [] : [run]),
  telemetry: telemetryStore(consent),
});

describe("recordExamTelemetry", () => {
  it("queues a submitted run's events and says how many", async () => {
    const deps = depsWith(SUBMITTED);

    expect(await recordExamTelemetry({ runId: RUN_ID }, deps)).toBe(4);
    expect(deps.telemetry.queued()).toEqual(examTelemetryEvents(SUBMITTED, resultOf(SUBMITTED), 3));
  });

  it("refuses a run it does not know", async () => {
    await expect(recordExamTelemetry({ runId: RUN_ID }, depsWith(null))).rejects.toThrow(UnknownExamRunError);
  });

  it("refuses a run still in progress, which has no result", async () => {
    const deps = depsWith(aRun({ answers: SUBMITTED.answers }));
    await expect(recordExamTelemetry({ runId: RUN_ID }, deps)).rejects.toThrow(ExamNotSubmittedError);
    expect(deps.telemetry.queued()).toEqual([]);
  });
});

describe("telemetryConsent and setTelemetryConsent", () => {
  it("reads 'unasked' on a fresh device", async () => {
    expect(await telemetryConsent(depsWith(null))).toBe("unasked");
  });

  it("shares the exam the prompt was shown on when turned on from it", async () => {
    const deps = depsWith(SUBMITTED);

    await setTelemetryConsent({ consent: "on", runId: RUN_ID }, deps);

    expect(await deps.telemetry.consent()).toBe("on");
    expect(deps.telemetry.queued()).toHaveLength(4);
  });

  it("does not queue an exam twice when sharing was already on, since it was queued at submit", async () => {
    const deps = depsWith(SUBMITTED, "on");

    await setTelemetryConsent({ consent: "on", runId: RUN_ID }, deps);

    expect(deps.telemetry.queued()).toEqual([]);
  });

  it("turns on from settings without queuing any exam", async () => {
    const deps = depsWith(SUBMITTED, "off");

    await setTelemetryConsent({ consent: "on" }, deps);

    expect(await deps.telemetry.consent()).toBe("on");
    expect(deps.telemetry.queued()).toEqual([]);
  });

  it("empties the queue when turned off, so nothing waiting is sent after a no", async () => {
    const deps = depsWith(SUBMITTED, "on");
    await deps.telemetry.enqueue([anEvent("q1")]);

    await setTelemetryConsent({ consent: "off" }, deps);

    expect(await deps.telemetry.consent()).toBe("off");
    expect(deps.telemetry.queued()).toEqual([]);
  });

  it("can be set back to 'unasked' without queuing anything", async () => {
    const deps = depsWith(SUBMITTED, "off");

    await setTelemetryConsent({ consent: "unasked", runId: RUN_ID }, deps);

    expect(await deps.telemetry.consent()).toBe("unasked");
    expect(deps.telemetry.queued()).toEqual([]);
  });
});

describe("flushTelemetry", () => {
  const queued = async (consent: "on" | "off" | "unasked", count: number) => {
    const telemetry = telemetryStore(consent);
    await telemetry.enqueue(Array.from({ length: count }, (_, i) => anEvent(`i-${String(i)}`)));
    return telemetry;
  };

  it("sends nothing unless this device shares", async () => {
    for (const consent of ["off", "unasked"] as const) {
      const telemetry = await queued(consent, 3);
      const sink = sinkOf();
      expect(await flushTelemetry({ telemetry, sink })).toEqual({ sent: 0, dropped: 0, pending: false });
      expect(sink.batches()).toEqual([]);
    }
  });

  it("sends an empty queue as nothing", async () => {
    const sink = sinkOf();
    expect(await flushTelemetry({ telemetry: telemetryStore("on"), sink })).toEqual({ sent: 0, dropped: 0, pending: false });
    expect(sink.batches()).toEqual([]);
  });

  it("sends oldest first, in batches of at most the cap, and empties the queue", async () => {
    const telemetry = await queued("on", TELEMETRY_MAX_BATCH * 2 + 50);
    const sink = sinkOf();

    expect(await flushTelemetry({ telemetry, sink })).toEqual({ sent: TELEMETRY_MAX_BATCH * 2 + 50, dropped: 0, pending: false });
    expect(sink.batches().map((b) => b.length)).toEqual([TELEMETRY_MAX_BATCH, TELEMETRY_MAX_BATCH, 50]);
    expect(sink.batches()[0]?.[0]?.itemId).toBe("i-0");
    expect(telemetry.queued()).toEqual([]);
  });

  it("keeps an undelivered batch queued and stops, having removed only what was accepted", async () => {
    const telemetry = await queued("on", TELEMETRY_MAX_BATCH + 10);
    const sink = sinkOf(new Map([[1, new TelemetryUnavailableError("offline")]]));

    expect(await flushTelemetry({ telemetry, sink })).toEqual({ sent: TELEMETRY_MAX_BATCH, dropped: 0, pending: true });
    expect(telemetry.queued()).toHaveLength(10);
  });

  it("drops a batch the service refused and goes on, so it cannot hold the queue up", async () => {
    const telemetry = await queued("on", TELEMETRY_MAX_BATCH + 10);
    const sink = sinkOf(new Map([[0, new TelemetryRejectedError(400)]]));

    expect(await flushTelemetry({ telemetry, sink })).toEqual({ sent: 10, dropped: TELEMETRY_MAX_BATCH, pending: false });
    expect(telemetry.queued()).toEqual([]);
    expect(sink.batches().map((b) => b.length)).toEqual([10]);
  });

  it("throws any other failure, and keeps the batch", async () => {
    const telemetry = await queued("on", 3);
    const sink = sinkOf(new Map([[0, new Error("a defect")]]));

    await expect(flushTelemetry({ telemetry, sink })).rejects.toThrow("a defect");
    expect(telemetry.queued()).toHaveLength(3);
  });
});
