import { type Attempt, attemptId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { attemptStore, scheduleStore, sessionStore, settingsStore } from "../use-cases/__tests__/sync-fakes.js";
import {
  attemptRecord,
  collectRecords,
  decodeRecord,
  keyOf,
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

const stores = () => ({
  attempts: attemptStore(),
  schedule: scheduleStore(),
  sessions: sessionStore(),
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
    expect(decodeRecord("setting", "goal", { key: "goal", value: 20 })).toEqual(settingRecord({ key: "goal", value: 20 }));
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
      settingRecord({ key: "goal", value: 20 }),
    ]) {
      await writeRecord(record, device);
    }

    const records = await collectRecords(device);

    expect([...records.keys()].sort()).toEqual(
      [keyOf("attempt", "a-1"), keyOf("schedule", "i-1"), keyOf("session", "s-1"), keyOf("setting", "goal")].sort(),
    );
    expect(await device.settings.get("goal")).toBe(20);
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
