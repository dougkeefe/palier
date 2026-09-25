import { type Attempt, attemptId, formId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { attemptStore, examRunStore, scheduleStore, sessionStore, settingsStore } from "../use-cases/__tests__/sync-fakes.js";
import {
  attemptRecord,
  collectRecords,
  decodeRecord,
  examRunRecord,
  keyOf,
  liveRecords,
  recordHash,
  scheduleRecord,
  sessionRecord,
  settingRecord,
  stableJson,
  writeRecord,
} from "./records.js";

const anAttempt: Attempt = {
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
};
const anEntry = { itemId: itemId("i-1"), due: null, skill: "reading" as const, box: 5 };
const aSession = { id: sessionId("s-1"), mode: "drill" as const, startedAt: "2026-09-24T09:00:00.000Z", completedAt: null };

const aRun = {
  id: sessionId("r-1"),
  formId: formId("f-1"),
  startedAt: "2026-09-24T09:00:00.000Z",
  answers: [
    {
      itemId: itemId("i-1"),
      response: "a" as const,
      msToFirstSelect: 10,
      msToConfirm: 20,
      changedAnswer: false,
      answeredAt: "2026-09-24T09:04:00.000Z",
    },
  ],
  flagged: [],
  elapsedMs: 5_000,
  checkpointedAt: "2026-09-24T09:05:00.000Z",
  submittedAt: null,
};

const stores = () => ({
  attempts: attemptStore(),
  schedule: scheduleStore(),
  sessions: sessionStore(),
  examRuns: examRunStore(),
  settings: settingsStore(),
});

describe("stableJson", () => {
  it("sorts object keys at every depth, keeps array order, and drops undefined like JSON does", () => {
    expect(stableJson({ b: 1, a: { d: [2, 1], c: undefined } })).toBe('{"a":{"d":[2,1]},"b":1}');
  });

  it("serialises two equal records identically whatever order their fields were written in", () => {
    expect(stableJson({ x: 1, y: [{ q: 1, p: 2 }] })).toBe(stableJson({ y: [{ p: 2, q: 1 }], x: 1 }));
  });
});

describe("recordHash", () => {
  it("is a 64-bit hex fingerprint that ignores key order and changes with any field", () => {
    const hash = recordHash(anEntry);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(recordHash({ box: 5, skill: "reading", due: null, itemId: "i-1" })).toBe(hash);
    expect(recordHash({ ...anEntry, box: 4 })).not.toBe(hash);
  });
});

describe("decodeRecord", () => {
  it("reads each aggregate back from a payload, keyed by its own id", () => {
    expect(decodeRecord("attempt", "a-1", anAttempt)).toEqual(attemptRecord(anAttempt));
    expect(decodeRecord("schedule", "i-1", anEntry)).toEqual(scheduleRecord(anEntry));
    expect(decodeRecord("session", "s-1", aSession)).toEqual(sessionRecord(aSession));
    expect(decodeRecord("examRun", "r-1", aRun)).toEqual(examRunRecord(aRun));
    expect(decodeRecord("setting", "goal", { key: "goal", value: 20 })).toEqual(settingRecord({ key: "goal", value: 20 }));
  });

  it("keeps an exam run's time allowance and pause count through a pull, so a synced run is not silently shortened", () => {
    const withBoth = { ...aRun, timeAllowance: 1.5, resumes: 2 };

    expect(decodeRecord("examRun", "r-1", withBoth)).toEqual(examRunRecord(withBoth));
    expect(decodeRecord("examRun", "r-1", { ...aRun, timeAllowance: 0.5 })).toBeNull();
  });

  it("hashes a run without the optional fields exactly as before they existed, so no ledger turns dirty", () => {
    expect(recordHash(decodeRecord("examRun", "r-1", aRun)?.value)).toBe(recordHash(aRun));
    expect(recordHash({ ...aRun, resumes: 1 })).not.toBe(recordHash(aRun));
  });

  it("refuses a payload that is not a valid record of its type", () => {
    expect(decodeRecord("schedule", "i-1", { ...anEntry, box: 0 })).toBeNull();
    expect(decodeRecord("attempt", "a-1", "not a record")).toBeNull();
  });

  it("refuses a payload whose id is not the document's, so one record cannot overwrite another", () => {
    expect(decodeRecord("schedule", "i-2", anEntry)).toBeNull();
  });
});

describe("collectRecords and writeRecord", () => {
  it("round-trips one record of every aggregate through the stores, keyed by type and id", async () => {
    const device = stores();
    for (const record of [
      attemptRecord(anAttempt),
      scheduleRecord(anEntry),
      sessionRecord(aSession),
      examRunRecord(aRun),
      settingRecord({ key: "goal", value: 20 }),
    ]) {
      await writeRecord(record, device);
    }

    const records = await collectRecords(device);

    expect([...records.keys()].sort()).toEqual(
      [
        keyOf("attempt", "a-1"),
        keyOf("schedule", "i-1"),
        keyOf("session", "s-1"),
        keyOf("examRun", "r-1"),
        keyOf("setting", "goal"),
      ].sort(),
    );
    expect(await device.settings.get("goal")).toBe(20);
    expect(await device.examRuns.get(sessionId("r-1"))).toEqual(aRun);
  });

  it("replaces a schedule entry, session or setting, and leaves an existing attempt as it was", async () => {
    const device = stores();
    await writeRecord(scheduleRecord(anEntry), device);
    await writeRecord(scheduleRecord({ ...anEntry, box: 1 }), device);
    await writeRecord(attemptRecord(anAttempt), device);
    await writeRecord(attemptRecord({ ...anAttempt, correct: false }), device);

    expect((await device.schedule.get(itemId("i-1")))?.box).toBe(1);
    expect((await device.attempts.all())[0]?.correct).toBe(true);
  });
});

describe("liveRecords", () => {
  it("reads an exam run as the device holds it now, by id, and null for one it does not hold", async () => {
    const device = stores();
    const live = liveRecords(device);
    await device.examRuns.put({ ...aRun, elapsedMs: 9_000 });

    expect(await live("examRun", "r-1")).toEqual(examRunRecord({ ...aRun, elapsedMs: 9_000 }));
    expect(await live("examRun", "r-404")).toBeNull();
  });
});
