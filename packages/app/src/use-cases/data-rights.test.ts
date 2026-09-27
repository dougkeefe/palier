import { type Attempt, attemptId, formId, itemId, sessionId } from "@palier/domain";
import { describe, expect, it, vi } from "vitest";

import type {
  AttemptStore,
  Clock,
  ExamRun,
  KeyVault,
  ScheduleEntry,
  ScheduleStore,
  Session,
  SessionStore,
  SettingsStore,
} from "../ports/index.js";
import { exportData } from "./export-data.js";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  type ExportDocument,
  InvalidExportError,
  parseExportDocument,
} from "./export-document.js";
import { importData } from "./import-data.js";
import { wipeData } from "./wipe-data.js";
import { examRunStore } from "./__tests__/sync-fakes.js";
import { aCostEntry, costLedger } from "./__tests__/spend-fakes.js";
import { aGeneratedSet, generatedStore } from "./__tests__/generated-fakes.js";
import { anOralSession, oralStore } from "./__tests__/oral-fakes.js";
import { aSubmission, writingStore } from "./__tests__/writing-fakes.js";
import { telemetryStore } from "./__tests__/telemetry-fakes.js";

// Local stubs rather than @palier/testing (progress.md D37). These are small
// *stateful* stores, because export → wipe → import is only meaningful over state.

const NOW = "2026-09-24T12:00:00.000Z";
const clockOf = (iso = NOW): Clock => ({ now: vi.fn(() => iso) });

const anAttempt = (id: string, over: Partial<Attempt> = {}): Attempt => ({
  id: attemptId(id),
  itemId: itemId(`item-${id}`),
  bankVersion: 1,
  skill: "reading",
  sessionId: sessionId("s-1"),
  chosen: "a",
  correct: true,
  msToFirstSelect: 1000,
  msToConfirm: 2000,
  changedAnswer: false,
  mode: "drill",
  ts: "2026-09-20T10:00:00.000Z",
  ...over,
});

const anEntry = (id: string, over: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
  itemId: itemId(id),
  due: "2026-09-25T00:00:00.000Z",
  skill: "reading",
  box: 2,
  ...over,
});

const aSession = (id: string, over: Partial<Session> = {}): Session => ({
  id: sessionId(id),
  mode: "drill",
  startedAt: "2026-09-20T09:00:00.000Z",
  completedAt: "2026-09-20T09:15:00.000Z",
  ...over,
});

const anExamRun = (id: string, over: Partial<ExamRun> = {}): ExamRun => ({
  id: sessionId(id),
  formId: formId("form-1"),
  startedAt: "2026-09-21T09:00:00.000Z",
  answers: [
    {
      itemId: itemId("item-a"),
      response: "b",
      msToFirstSelect: 900,
      msToConfirm: 1500,
      changedAnswer: true,
      answeredAt: "2026-09-21T09:05:00.000Z",
    },
  ],
  flagged: [itemId("item-b")],
  elapsedMs: 600_000,
  checkpointedAt: "2026-09-21T09:10:00.000Z",
  submittedAt: "2026-09-21T09:40:00.000Z",
  ...over,
});

const attemptStore = (): AttemptStore => {
  const rows = new Map<string, Attempt>();
  return {
    append: (a) => {
      if (rows.has(a.id)) return Promise.resolve(false);
      rows.set(a.id, a);
      return Promise.resolve(true);
    },
    recent: () => Promise.resolve([]),
    since: () => Promise.resolve([]),
    forItem: () => Promise.resolve([]),
    all: () => Promise.resolve([...rows.values()]),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

const scheduleStore = (): ScheduleStore => {
  const rows = new Map<string, ScheduleEntry>();
  return {
    due: () => Promise.resolve([]),
    get: (id) => Promise.resolve(rows.get(id) ?? null),
    put: (e) => {
      rows.set(e.itemId, e);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...rows.values()]),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

const sessionStore = (): SessionStore => {
  const rows = new Map<string, Session>();
  return {
    create: (s) => {
      rows.set(s.id, s);
      return Promise.resolve();
    },
    complete: () => Promise.resolve(null),
    latest: () => Promise.resolve(null),
    all: () => Promise.resolve([...rows.values()]),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

const settingsStore = (): SettingsStore => {
  const rows = new Map<string, unknown>();
  return {
    get: <T>(key: string) => Promise.resolve((rows.has(key) ? rows.get(key) : null) as T | null),
    set: (key, value) => {
      rows.set(key, value);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...rows].map(([key, value]) => ({ key, value }))),
    clear: () => {
      rows.clear();
      return Promise.resolve();
    },
  };
};

const vaultOf = (): KeyVault & { readonly apiKeyCleared: () => boolean } => {
  let cleared = false;
  return {
    putApiKey: () => Promise.resolve(),
    withApiKey: () => Promise.reject(new Error("no key")),
    hasApiKey: () => Promise.resolve(!cleared),
    apiKeyStorage: () => Promise.resolve(cleared ? null : "device"),
    clear: () => {
      cleared = true;
      return Promise.resolve();
    },
    deviceSecret: () => Promise.resolve("device-secret"),
    apiKeyCleared: () => cleared,
  };
};

/** A device holding one of everything. */
const aDevice = async () => {
  const device = {
    clock: clockOf(),
    attempts: attemptStore(),
    schedule: scheduleStore(),
    sessions: sessionStore(),
    examRuns: examRunStore(),
    settings: settingsStore(),
    vault: vaultOf(),
    telemetry: telemetryStore("on"),
    ledger: costLedger([aCostEntry()]),
    writing: writingStore([aSubmission()]),
    generated: generatedStore([aGeneratedSet()]),
    oral: oralStore([
      anOralSession({
        turns: [{ speaker: "candidate", text: "ORAL-TRANSCRIPT-MARKER", phase: 0, startMs: 0, endMs: 900 }],
      }),
    ]),
  };
  await device.attempts.append(anAttempt("b"));
  await device.attempts.append(anAttempt("a", { skill: "writing" }));
  await device.schedule.put(anEntry("item-a"));
  await device.schedule.put(anEntry("retired", { due: null, box: 5 }));
  await device.sessions.create(aSession("s-1"));
  await device.sessions.create(aSession("s-2", { completedAt: null }));
  await device.examRuns.put(anExamRun("run-2", { submittedAt: null }));
  await device.examRuns.put(anExamRun("run-1"));
  await device.settings.set("locale", "fr");
  await device.settings.set("goal", { minutes: 20 });
  return device;
};

const aDocument = (over: Partial<ExportDocument> = {}): ExportDocument => ({
  format: EXPORT_FORMAT,
  version: EXPORT_VERSION,
  exportedAt: NOW,
  attempts: [anAttempt("a")],
  schedule: [anEntry("item-a")],
  sessions: [aSession("s-1")],
  examRuns: [],
  settings: [{ key: "locale", value: "fr" }],
  ...over,
});

const textOf = (doc: unknown) => JSON.stringify(doc);

describe("exportData", () => {
  it("writes every record of the five stores into one versioned, dated document", async () => {
    const doc = await exportData(await aDevice());

    expect(doc.format).toBe(EXPORT_FORMAT);
    expect(doc.version).toBe(EXPORT_VERSION);
    expect(doc.exportedAt).toBe(NOW);
    expect(doc.attempts).toHaveLength(2);
    // Retired entries carry an item's history, so they are exported too.
    expect(doc.schedule.map((e) => e.itemId)).toEqual(["item-a", "retired"]);
    expect(doc.sessions).toHaveLength(2);
    expect(doc.examRuns).toHaveLength(2);
    expect(doc.settings).toHaveLength(2);
  });

  it("sorts every list by its key, so the same state always exports identically", async () => {
    const doc = await exportData(await aDevice());

    expect(doc.attempts.map((a) => a.id)).toEqual(["a", "b"]);
    expect(doc.sessions.map((s) => s.id)).toEqual(["s-1", "s-2"]);
    expect(doc.examRuns.map((r) => r.id)).toEqual(["run-1", "run-2"]);
    expect(doc.settings.map((s) => s.key)).toEqual(["goal", "locale"]);
    expect(textOf(await exportData(await aDevice()))).toBe(textOf(doc));
  });

  it("never carries the cost ledger, which is never exported (architecture.md §9.4, D101)", async () => {
    const device = await aDevice();
    const text = textOf(await exportData(device));

    expect(device.ledger.entries()).toHaveLength(1);
    expect(text).not.toContain("writing-feedback");
    expect(text).not.toContain("inputTokens");
  });

  it("never carries the writing workshop's submissions, which are never exported (D106) [R12]", async () => {
    const device = await aDevice();
    const text = textOf(await exportData(device));

    expect(await device.writing.all()).toHaveLength(1);
    expect(text).not.toContain(aSubmission().text);
    expect(text).not.toContain("promptId");
  });

  it("never carries a runtime-generated set, which is never exported (D110)", async () => {
    const device = await aDevice();
    const text = textOf(await exportData(device));

    expect(device.generated.sets()).toHaveLength(1);
    expect(text).not.toContain("GENERATED-MARKER");
    expect(text).not.toContain("gen-1");
  });

  it("never carries a spoken session or its transcript, which are never exported (D115)", async () => {
    const device = await aDevice();
    await device.oral.putAudio(anOralSession().id, new Blob(["son"]));
    const text = textOf(await exportData(device));

    expect(await device.oral.all()).toHaveLength(1);
    expect(text).not.toContain("ORAL-TRANSCRIPT-MARKER");
    expect(text).not.toContain(anOralSession().id);
  });

  it("never carries the API key or the device secret", async () => {
    const device = await aDevice();
    const text = textOf(await exportData(device));

    expect(text).not.toContain("device-secret");
    expect(Object.keys(await exportData(device)).sort()).toEqual(
      ["attempts", "examRuns", "exportedAt", "format", "schedule", "sessions", "settings", "version"].sort(),
    );
  });
});

describe("wipeData", () => {
  it("empties every progress store and clears the API key", async () => {
    const device = await aDevice();
    await wipeData(device);

    expect(await device.attempts.all()).toEqual([]);
    expect(await device.schedule.all()).toEqual([]);
    expect(await device.sessions.all()).toEqual([]);
    expect(await device.examRuns.all()).toEqual([]);
    expect(await device.settings.all()).toEqual([]);
    expect(device.vault.apiKeyCleared()).toBe(true);
  });

  it("empties the telemetry queue and forgets the consent, back to not asked", async () => {
    const device = await aDevice();
    await device.telemetry.enqueue([{ itemId: itemId("item-a"), correct: true, responseMs: 900, bankVersion: 2, restBucket: 2 }]);
    await wipeData(device);

    expect(device.telemetry.queued()).toEqual([]);
    expect(await device.telemetry.consent()).toBe("unasked");
  });

  it("empties the cost ledger, which only this device ever held (D101)", async () => {
    const device = await aDevice();
    await wipeData(device);

    expect(device.ledger.entries()).toEqual([]);
  });

  it("empties the writing workshop's submissions, which only this device ever held (D106)", async () => {
    const device = await aDevice();
    await wipeData(device);

    expect(await device.writing.all()).toEqual([]);
  });

  it("empties the runtime-generated sets, which only this device ever held (D110)", async () => {
    const device = await aDevice();
    await wipeData(device);

    expect(device.generated.sets()).toEqual([]);
  });

  it("empties the spoken sessions and their recordings, which only this device ever held (D115)", async () => {
    const device = await aDevice();
    await device.oral.putAudio(anOralSession().id, new Blob(["son"]));
    await wipeData(device);

    expect(await device.oral.all()).toEqual([]);
    expect(await device.oral.audioIndex()).toEqual([]);
  });

  it("keeps the device secret, which is the device's sync identity, not the user's progress", async () => {
    const device = await aDevice();
    await wipeData(device);

    expect(await device.vault.deviceSecret()).toBe("device-secret");
  });
});

describe("importData", () => {
  it("restores a wiped device exactly: export, wipe, import, export again gives the same document", async () => {
    const device = await aDevice();
    const before = await exportData(device);

    await wipeData(device);
    const result = await importData({ json: textOf(before) }, device);

    expect(await exportData(device)).toEqual(before);
    expect(result).toEqual({
      attempts: { added: 2, merged: 0, kept: 0 },
      schedule: { added: 2, merged: 0, kept: 0 },
      sessions: { added: 2, merged: 0, kept: 0 },
      examRuns: { added: 2, merged: 0, kept: 0 },
      settings: { added: 2, merged: 0, kept: 0 },
    });
  });

  it("changes nothing when the same file is imported twice", async () => {
    const device = await aDevice();
    const text = textOf(await exportData(device));
    await wipeData(device);
    await importData({ json: text }, device);

    const second = await importData({ json: text }, device);

    expect(second).toEqual({
      attempts: { added: 0, merged: 0, kept: 2 },
      schedule: { added: 0, merged: 0, kept: 2 },
      sessions: { added: 0, merged: 0, kept: 2 },
      examRuns: { added: 0, merged: 0, kept: 2 },
      settings: { added: 0, merged: 0, kept: 2 },
    });
    expect(textOf(await exportData(device))).toBe(text);
  });

  it("merges attempts as a union: new ones are added, ones already here are the no-op", async () => {
    const device = await aDevice();
    await importData(
      { json: textOf(aDocument({ attempts: [anAttempt("a"), anAttempt("c")], schedule: [], sessions: [], settings: [] })) },
      device,
    );

    expect((await device.attempts.all()).map((a) => a.id).sort()).toEqual(["a", "b", "c"]);
  });

  /**
   * Gate B's rule, applied to import (progress.md D69, replacing D62's keep-local): a
   * file has no causal history, so a record the device already has is a concurrent
   * edit — the lower box wins, the completed session wins, the local setting wins.
   */
  it("merges a record the device already has: lower box, completed session, local setting", async () => {
    const device = await aDevice();
    const incoming = aDocument({
      attempts: [],
      schedule: [anEntry("item-a", { box: 4 }), anEntry("item-new")],
      sessions: [aSession("s-2", { completedAt: "2026-09-21T00:00:00.000Z" }), aSession("s-new")],
      settings: [
        { key: "locale", value: "en" },
        { key: "theme", value: "dark" },
      ],
    });

    const result = await importData({ json: textOf(incoming) }, device);

    expect((await device.schedule.get(itemId("item-a")))?.box).toBe(2);
    expect(await device.schedule.get(itemId("item-new"))).not.toBeNull();
    expect((await device.sessions.all()).find((s) => s.id === "s-2")?.completedAt).toBe("2026-09-21T00:00:00.000Z");
    expect(await device.settings.get("locale")).toBe("fr");
    expect(await device.settings.get("theme")).toBe("dark");
    expect(result.schedule).toEqual({ added: 1, merged: 0, kept: 1 });
    expect(result.sessions).toEqual({ added: 1, merged: 1, kept: 0 });
    expect(result.settings).toEqual({ added: 1, merged: 0, kept: 1 });
  });

  it("sends an item back to the file's lower box, never forward to a higher one", async () => {
    const device = await aDevice();
    await device.schedule.put(anEntry("item-b", { box: 3, due: "2026-10-01T00:00:00.000Z" }));
    const incoming = aDocument({
      attempts: [],
      schedule: [anEntry("item-a", { box: 1, due: "2026-09-21T00:00:00.000Z" }), anEntry("item-b", { box: 4 })],
      sessions: [],
      settings: [],
    });

    const result = await importData({ json: textOf(incoming) }, device);

    expect(await device.schedule.get(itemId("item-a"))).toEqual(anEntry("item-a", { box: 1, due: "2026-09-21T00:00:00.000Z" }));
    expect((await device.schedule.get(itemId("item-b")))?.box).toBe(3);
    expect(result.schedule).toEqual({ added: 0, merged: 1, kept: 1 });
  });

  it("treats a stored null setting as a local record and keeps it", async () => {
    const device = await aDevice();
    await device.settings.set("testDate", null);
    await importData(
      { json: textOf(aDocument({ attempts: [], schedule: [], sessions: [], settings: [{ key: "testDate", value: "2026-12-01" }] })) },
      device,
    );

    expect(await device.settings.get("testDate")).toBeNull();
  });

  it("counts a record the file repeats once, so a hand-edited export cannot double-write", async () => {
    const device = { ...(await aDevice()), sessions: sessionStore(), settings: settingsStore() };
    const result = await importData(
      {
        json: textOf(
          aDocument({
            attempts: [],
            schedule: [],
            sessions: [aSession("dup"), aSession("dup")],
            settings: [
              { key: "k", value: 1 },
              { key: "k", value: 2 },
            ],
          }),
        ),
      },
      device,
    );

    expect(result.sessions).toEqual({ added: 1, merged: 0, kept: 1 });
    expect(result.settings).toEqual({ added: 1, merged: 0, kept: 1 });
    expect(await device.settings.get("k")).toBe(1);
  });

  it("keeps the submitted copy of an exam run over an in-progress one, from either side", async () => {
    const device = { ...(await aDevice()), examRuns: examRunStore() };
    await device.examRuns.put(anExamRun("run-1", { submittedAt: null, elapsedMs: 900_000 }));

    const result = await importData({ json: textOf(aDocument({ examRuns: [anExamRun("run-1")] })) }, device);

    expect(result.examRuns).toEqual({ added: 0, merged: 1, kept: 0 });
    expect(await device.examRuns.get(sessionId("run-1"))).toEqual(anExamRun("run-1"));

    const again = await importData(
      { json: textOf(aDocument({ examRuns: [anExamRun("run-1", { submittedAt: null, elapsedMs: 999_000 })] })) },
      device,
    );
    expect(again.examRuns).toEqual({ added: 0, merged: 0, kept: 1 });
  });

  it("writes nothing when any record in the file is invalid", async () => {
    const device = { ...(await aDevice()), attempts: attemptStore() };
    const bad = { ...aDocument({ attempts: [anAttempt("ok")] }), schedule: [{ itemId: "x", due: "soon", skill: "reading", box: 1 }] };

    await expect(importData({ json: textOf(bad) }, device)).rejects.toThrow(InvalidExportError);
    expect(await device.attempts.all()).toEqual([]);
  });
});

describe("parseExportDocument", () => {
  const rejects = (text: string, reason: RegExp) => {
    let caught: unknown;
    try {
      parseExportDocument(text);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidExportError);
    expect((caught as InvalidExportError).reason).toMatch(reason);
    expect((caught as InvalidExportError).message).toContain("not a Palier export this version can import");
  };

  it("reads a valid document back to the same value", () => {
    const doc = aDocument({ schedule: [anEntry("r", { due: null, box: 5 })], sessions: [aSession("o", { completedAt: null })] });
    expect(parseExportDocument(textOf(doc))).toEqual(doc);
  });

  it("brands the ids it reads, so they are usable as domain ids", () => {
    const doc = parseExportDocument(textOf(aDocument()));
    expect(doc.attempts[0]?.id).toBe("a");
    expect(doc.schedule[0]?.itemId).toBe("item-a");
    expect(doc.sessions[0]?.id).toBe("s-1");
  });

  it("rejects text that is not JSON", () => rejects("{not json", /not JSON/));

  it("rejects JSON that is not a Palier export", () => {
    rejects("[]", /not a Palier export/);
    rejects("null", /not a Palier export/);
    rejects(textOf({ ...aDocument(), format: "other-app" }), /not a Palier export/);
  });

  it("reads a version 1 file, which predates exam runs, as a document with none", () => {
    const { examRuns: _examRuns, ...v1 } = { ...aDocument(), version: 1 };

    expect(parseExportDocument(textOf(v1))).toEqual(aDocument({ examRuns: [] }));
  });

  it("imports a version 1 file onto a device and leaves its exam runs alone", async () => {
    const device = await aDevice();
    const { examRuns: _examRuns, ...v1 } = { ...aDocument(), version: 1 };

    const result = await importData({ json: textOf(v1) }, device);

    expect(result.examRuns).toEqual({ added: 0, merged: 0, kept: 0 });
    expect(await device.examRuns.all()).toHaveLength(2);
  });

  it("rejects a version 2 document with no exam-run list", () => {
    const { examRuns: _examRuns, ...withoutRuns } = aDocument();
    rejects(textOf(withoutRuns), /"examRuns" is missing/);
  });

  it("reads exam runs back to the same value, in progress or submitted", () => {
    const doc = aDocument({ examRuns: [anExamRun("r-1"), anExamRun("r-2", { submittedAt: null, answers: [], flagged: [] })] });
    expect(parseExportDocument(textOf(doc))).toEqual(doc);
  });

  it("reads a run's time allowance and pause count back, and leaves them absent when they were absent", () => {
    const doc = aDocument({ examRuns: [anExamRun("r-1", { timeAllowance: 1.5, resumes: 3 }), anExamRun("r-2")] });

    const parsed = parseExportDocument(textOf(doc));

    expect(parsed).toEqual(doc);
    expect(parsed.examRuns[1]).not.toHaveProperty("timeAllowance");
    expect(parsed.examRuns[1]).not.toHaveProperty("resumes");
  });

  it("names an invalid exam run, for each way one can be wrong", () => {
    const answer = anExamRun("r").answers[0];
    for (const bad of [
      "not-a-record",
      { ...anExamRun("r"), id: "" },
      { ...anExamRun("r"), formId: 7 },
      { ...anExamRun("r"), startedAt: "dawn" },
      { ...anExamRun("r"), answers: "all of them" },
      { ...anExamRun("r"), flagged: [""] },
      { ...anExamRun("r"), flagged: "q1" },
      { ...anExamRun("r"), elapsedMs: -1 },
      { ...anExamRun("r"), elapsedMs: "long" },
      { ...anExamRun("r"), checkpointedAt: null },
      { ...anExamRun("r"), submittedAt: "later" },
      { ...anExamRun("r"), answers: [null] },
      { ...anExamRun("r"), answers: [{ ...answer, itemId: "" }] },
      { ...anExamRun("r"), answers: [{ ...answer, response: "z" }] },
      { ...anExamRun("r"), answers: [{ ...answer, msToFirstSelect: Number.NaN }] },
      { ...anExamRun("r"), answers: [{ ...answer, msToConfirm: -5 }] },
      { ...anExamRun("r"), answers: [{ ...answer, changedAnswer: "yes" }] },
      { ...anExamRun("r"), answers: [{ ...answer, answeredAt: "whenever" }] },
      { ...anExamRun("r"), timeAllowance: 0.5 },
      { ...anExamRun("r"), timeAllowance: Number.POSITIVE_INFINITY },
      { ...anExamRun("r"), timeAllowance: "1.5" },
      { ...anExamRun("r"), resumes: -1 },
      { ...anExamRun("r"), resumes: 1.5 },
    ]) {
      rejects(textOf({ ...aDocument(), examRuns: [bad] }), /examRuns\[0\] is not a valid exam run/);
    }
  });

  it("rejects a format version it does not know, naming it", () =>
    rejects(textOf({ ...aDocument(), version: 99 }), /version 99 is not supported/));

  it("rejects a document without a valid export date", () =>
    rejects(textOf({ ...aDocument(), exportedAt: "yesterday" }), /exportedAt/));

  it("rejects a document with a missing list", () => {
    const { settings: _settings, ...withoutSettings } = aDocument();
    rejects(textOf(withoutSettings), /"settings" is missing/);
    rejects(textOf({ ...aDocument(), attempts: {} }), /"attempts" is missing or not a list/);
  });

  it("names the first invalid attempt", () =>
    rejects(textOf(aDocument({ attempts: [anAttempt("a"), { ...anAttempt("b"), chosen: "z" } as never] })), /attempts\[1\]/));

  it("names an invalid schedule entry, for each way one can be wrong", () => {
    for (const bad of [
      "not-a-record",
      { ...anEntry("a"), itemId: "" },
      { ...anEntry("a"), due: "2026-13-45" },
      { ...anEntry("a"), skill: "juggling" },
      { ...anEntry("a"), box: 0 },
      { ...anEntry("a"), box: 1.5 },
    ]) {
      rejects(textOf({ ...aDocument(), schedule: [bad] }), /schedule\[0\]/);
    }
  });

  it("names an invalid session, for each way one can be wrong", () => {
    for (const bad of [
      null,
      { ...aSession("s"), id: "" },
      { ...aSession("s"), mode: "napping" },
      { ...aSession("s"), startedAt: "noon" },
      { ...aSession("s"), completedAt: 5 },
    ]) {
      rejects(textOf({ ...aDocument(), sessions: [bad] }), /sessions\[0\]/);
    }
  });

  it("names an invalid setting, for each way one can be wrong", () => {
    for (const bad of [[], { key: "", value: 1 }, { key: "k" }]) {
      rejects(textOf({ ...aDocument(), settings: [bad] }), /settings\[0\]/);
    }
  });

  it("accepts a setting whose value is null, since null is a value", () => {
    expect(parseExportDocument(textOf(aDocument({ settings: [{ key: "k", value: null }] }))).settings).toEqual([
      { key: "k", value: null },
    ]);
  });

  it("accepts an offset timezone in an instant, not only Z", () => {
    expect(
      parseExportDocument(textOf(aDocument({ sessions: [aSession("s", { startedAt: "2026-09-20T09:00:00-04:00" })] })))
        .sessions[0]?.startedAt,
    ).toBe("2026-09-20T09:00:00-04:00");
  });
});
