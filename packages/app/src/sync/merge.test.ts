import { type Attempt, attemptId, formId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import type { ExamRun, ScheduleEntry, Session } from "../ports/index.js";
import { mergeRecord } from "./merge.js";
import {
  type SyncRecord,
  attemptRecord,
  examRunRecord,
  scheduleRecord,
  sessionRecord,
  settingRecord,
} from "./records.js";

const entry = (over: Partial<ScheduleEntry> = {}): SyncRecord =>
  scheduleRecord({ itemId: itemId("i-1"), due: "2026-09-25T00:00:00.000Z", skill: "reading", box: 2, ...over });

const session = (over: Partial<Session> = {}): SyncRecord =>
  sessionRecord({ id: sessionId("s-1"), mode: "drill", startedAt: "2026-09-24T09:00:00.000Z", completedAt: null, ...over });

const run = (over: Partial<ExamRun> = {}): SyncRecord =>
  examRunRecord({
    id: sessionId("r-1"),
    formId: formId("f-1"),
    startedAt: "2026-09-24T09:00:00.000Z",
    answers: [],
    flagged: [],
    elapsedMs: 60_000,
    checkpointedAt: "2026-09-24T09:01:00.000Z",
    submittedAt: null,
    ...over,
  });

const attempt = (over: Partial<Attempt> = {}): SyncRecord =>
  attemptRecord({
    id: attemptId("a-1"),
    itemId: itemId("i-1"),
    bankVersion: 1,
    skill: "reading",
    sessionId: sessionId("s-1"),
    chosen: "a",
    correct: true,
    msToFirstSelect: 1000,
    msToConfirm: 2000,
    changedAnswer: false,
    mode: "drill",
    ts: "2026-09-24T09:01:00.000Z",
    ...over,
  });

/** Every rule but the setting's must agree whichever device does the merging. */
const bothWays = (a: SyncRecord, b: SyncRecord): SyncRecord => {
  const one = mergeRecord(a, b);
  expect(mergeRecord(b, a)).toEqual(one);
  return one;
};

describe("mergeRecord — the schedule (Gate B: the lower Leitner box wins)", () => {
  it("keeps the lower box, whichever side holds it", () => {
    expect(bothWays(entry({ box: 1 }), entry({ box: 4 }))).toEqual(entry({ box: 1 }));
  });

  it("keeps the earlier due date when the boxes agree", () => {
    const sooner = entry({ due: "2026-09-25T00:00:00.000Z" });
    expect(bothWays(sooner, entry({ due: "2026-10-02T00:00:00.000Z" }))).toEqual(sooner);
  });

  it("treats a retired entry as due latest, so a scheduled copy in the same box wins", () => {
    const scheduled = entry({ box: 5, due: "2026-12-01T00:00:00.000Z" });
    expect(bothWays(scheduled, entry({ box: 5, due: null }))).toEqual(scheduled);
  });

  it("returns the record itself when both copies are identical", () => {
    expect(bothWays(entry({ due: null }), entry({ due: null }))).toEqual(entry({ due: null }));
  });

  it("breaks a tie the rule cannot decide by the records' content, the same on both devices", () => {
    bothWays(entry({ skill: "reading" }), entry({ skill: "writing" }));
  });
});

describe("mergeRecord — sessions (a completion never un-happens)", () => {
  it("keeps the completed copy over the in-progress one", () => {
    const done = session({ completedAt: "2026-09-24T09:20:00.000Z" });
    expect(bothWays(done, session())).toEqual(done);
  });

  it("keeps the earlier completion of two", () => {
    const first = session({ completedAt: "2026-09-24T09:20:00.000Z" });
    expect(bothWays(first, session({ completedAt: "2026-09-24T10:00:00.000Z" }))).toEqual(first);
  });

  it("returns the session unchanged when both copies are still in progress", () => {
    expect(bothWays(session(), session())).toEqual(session());
  });
});

describe("mergeRecord — exam runs (a submission never un-happens)", () => {
  it("keeps the submitted copy over an in-progress one, however much further the other went", () => {
    const submitted = run({ submittedAt: "2026-09-24T09:40:00.000Z", elapsedMs: 60_000 });
    expect(bothWays(submitted, run({ elapsedMs: 2_000_000 }))).toEqual(submitted);
  });

  it("keeps the earlier submission of two", () => {
    const first = run({ submittedAt: "2026-09-24T09:40:00.000Z" });
    expect(bothWays(first, run({ submittedAt: "2026-09-24T10:00:00.000Z" }))).toEqual(first);
  });

  it("keeps the winning copy whole, allowance and pause count included, and adds nothing from the other (D85)", () => {
    const further = run({ elapsedMs: 900_000, timeAllowance: 1.5, resumes: 1 });
    // The other device also resumed once. Its increment is lost: a whole record wins,
    // as D80 accepts for two in-progress copies' answers.
    expect(bothWays(further, run({ elapsedMs: 300_000, timeAllowance: 1.5, resumes: 1 }))).toEqual(further);
  });

  it("keeps the in-progress copy with more exam time used", () => {
    const further = run({ elapsedMs: 900_000 });
    expect(bothWays(further, run({ elapsedMs: 300_000 }))).toEqual(further);
  });

  it("breaks a tie the rule cannot decide by the records' content, the same on both devices", () => {
    bothWays(run({ flagged: [itemId("q1")] }), run({ flagged: [itemId("q2")] }));
  });
});

describe("mergeRecord — settings and attempts", () => {
  it("keeps the local setting: the preference the user just set on this device", () => {
    const local = settingRecord({ key: "goal", value: 20 });
    expect(mergeRecord(local, settingRecord({ key: "goal", value: 10 }))).toBe(local);
  });

  it("returns an attempt unchanged, since attempts are immutable", () => {
    expect(bothWays(attempt(), attempt())).toEqual(attempt());
  });

  it("still agrees on both devices if two copies of an attempt ever differed", () => {
    bothWays(attempt({ correct: true }), attempt({ correct: false }));
  });
});
