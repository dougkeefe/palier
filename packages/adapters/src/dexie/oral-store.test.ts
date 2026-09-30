import { StorageQuotaError } from "@palier/app";
import { scenarioId, sessionId } from "@palier/domain";
import { oralStoreContract } from "@palier/testing";
import { describe, expect, it, vi } from "vitest";

import { PalierDb } from "./db.js";
import { dexieOralStore, isQuotaError } from "./oral-store.js";

const dbName = (): string => `palier-oral-${globalThis.crypto.randomUUID()}`;

oralStoreContract("dexie", () => Promise.resolve(dexieOralStore(new PalierDb(dbName()))));

const aSession = {
  id: sessionId("oral-1"),
  scenarioId: scenarioId("scn-work-c"),
  startedAt: "2026-09-27T10:00:00.000Z",
  endedAt: "2026-09-27T10:10:00.000Z",
  endReason: "completed" as const,
  turns: [{ speaker: "candidate" as const, text: "Je suis analyste.", phase: 0, startMs: 1_000, endMs: 4_000 }],
  assessment: null,
};

/** A report over `aSession`'s one turn: "analyste" is at [8, 16). */
const aReport = () => {
  const criterion = { band: "C" as const, evidence: "e" };
  const fix = { criterion: "grammar" as const, subSkill: "agreement" as const, advice: "a", evidence: "e" };
  const word = { word: "conseillère", turn: 0, excerpt: "analyste", example: "Je suis conseillère." };
  return {
    criteria: { comprehension: criterion, fluency: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
    fixes: [fix, fix, fix],
    missingWords: [word, word, word, word, word],
    errors: [{ turn: 0, start: 8, end: 16, correction: "analyste principale", rule: "r" }],
  };
};

describe("dexieOralStore", () => {
  it("survives a reopen, recording included, so a session outlives the tab", async () => {
    const name = dbName();
    const first = dexieOralStore(new PalierDb(name));
    await first.put(aSession);
    await first.putAudio(aSession.id, new Blob(["enregistrement"], { type: "audio/webm" }));
    const reopened = dexieOralStore(new PalierDb(name));

    expect(await reopened.get(aSession.id)).toEqual(aSession);
    const blob = await reopened.audio(aSession.id);
    expect(blob?.type).toBe("audio/webm");
    expect(await blob?.text()).toBe("enregistrement");
  });

  it.each([
    ["an empty id", { id: "" }],
    ["no scenario", { scenarioId: 3 }],
    ["a start that is not an instant", { startedAt: "2026-99" }],
    ["an end with no reason", { endReason: null }],
    ["a reason with no end", { endedAt: null }],
    ["a reason it does not know", { endReason: "bored" }],
    ["turns that are not a list", { turns: "none" }],
    ["a turn that ends before it starts", { turns: [{ ...aSession.turns[0], startMs: 9, endMs: 1 }] }],
  ])("reads a session with %s as nothing", async (_, over) => {
    const db = new PalierDb(dbName());
    // Written straight to the table, as a row from an older or foreign build could be.
    await db.oralSessions.put({ ...aSession, id: sessionId("bad"), ...over } as never);
    await db.oralSessions.put({ ...aSession, id: sessionId("good") });
    const store = dexieOralStore(db);

    expect((await store.all()).map((s) => s.id)).toEqual(["good"]);
    expect(await store.get(sessionId("bad"))).toBeNull();
  });

  it("reads a session stored before reports existed, with no assessment at all, as unassessed (D126)", async () => {
    const db = new PalierDb(dbName());
    const { assessment: _assessment, ...older } = aSession;
    await db.oralSessions.put(older as never);

    expect(await dexieOralStore(db).get(aSession.id)).toEqual(aSession);
  });

  it.each([
    ["a report in the wrong shape", { ...aReport(), fixes: [] }],
    ["an error that no longer fits its turn", { ...aReport(), errors: [{ turn: 0, start: 8, end: 400, correction: "c", rule: "r" }] }],
    ["a word quoted from nowhere in the session", { ...aReport(), missingWords: Array(5).fill({ word: "w", turn: 0, excerpt: "budget", example: "x" }) }],
  ])("keeps the transcript of a session with %s, and reads it as unassessed (D126)", async (_, broken) => {
    const db = new PalierDb(dbName());
    await db.oralSessions.put({ ...aSession, assessment: broken } as never);

    expect(await dexieOralStore(db).get(aSession.id)).toEqual(aSession);
  });

  it("reads a whole report back with its session", async () => {
    const store = dexieOralStore(new PalierDb(dbName()));
    const assessed = { ...aSession, assessment: aReport() };
    await store.put(assessed);

    expect(await store.get(aSession.id)).toEqual(assessed);
  });

  it("reads a studio session's notes back with it (D168)", async () => {
    const store = dexieOralStore(new PalierDb(dbName()));
    const noted = { ...aSession, notes: [{ criterion: "grammar" as const, evidence: "« j'aurais »", severity: "minor" as const, phase: 0 }] };
    await store.put(noted);

    expect(await store.get(aSession.id)).toEqual(noted);
  });

  it("drops a broken note and keeps the rest, and the session, whole (D168)", async () => {
    const db = new PalierDb(dbName());
    const good = { criterion: "task", evidence: "a répondu à côté", severity: "major", phase: 1 };
    await db.oralSessions.put({ ...aSession, notes: [good, { ...good, criterion: "pronunciation" }, "note"] } as never);

    expect(await dexieOralStore(db).get(aSession.id)).toEqual({ ...aSession, notes: [good] });
  });

  it.each([
    ["only broken notes", [{ criterion: "task", evidence: "", severity: "major", phase: 0 }]],
    ["notes that are not a list", "a note"],
  ])("reads a session with %s as having none", async (_, notes) => {
    const db = new PalierDb(dbName());
    await db.oralSessions.put({ ...aSession, notes } as never);

    expect(await dexieOralStore(db).get(aSession.id)).toEqual(aSession);
  });

  it("reads a running session, with no end and no reason, as whole", async () => {
    const running = { ...aSession, endedAt: null, endReason: null };
    const store = dexieOralStore(new PalierDb(dbName()));
    await store.put(running);

    expect(await store.get(aSession.id)).toEqual(running);
  });

  it.each([
    ["no blob", { blob: "audio" }],
    ["a size that is not a number", { bytes: "4" }],
    ["a start that is not an instant", { startedAt: null }],
  ])("reads a recording with %s as nothing", async (_, over) => {
    const db = new PalierDb(dbName());
    await db.oralAudio.put({ sessionId: aSession.id, blob: new Blob(["x"]), bytes: 1, startedAt: aSession.startedAt, ...over } as never);
    const store = dexieOralStore(db);

    expect(await store.audio(aSession.id)).toBeNull();
    expect(await store.audioIndex()).toEqual([]);
  });

  it("turns a full device into StorageQuotaError, and stores nothing", async () => {
    const db = new PalierDb(dbName());
    const store = dexieOralStore(db);
    await store.put(aSession);
    // fake-indexeddb never runs out of room, so the browser's refusal is injected.
    vi.spyOn(db.oralAudio, "put").mockRejectedValueOnce(new DOMException("The quota has been exceeded.", "QuotaExceededError"));

    await expect(store.putAudio(aSession.id, new Blob(["son"]))).rejects.toBeInstanceOf(StorageQuotaError);
    expect(await store.audioIndex()).toEqual([]);
  });

  it("passes any other failure through unchanged", async () => {
    const db = new PalierDb(dbName());
    const store = dexieOralStore(db);
    await store.put(aSession);
    vi.spyOn(db.oralAudio, "put").mockRejectedValueOnce(new Error("disk on fire"));

    await expect(store.putAudio(aSession.id, new Blob(["son"]))).rejects.toThrow("disk on fire");
  });

  it("keeps its rows apart from the synced settings", async () => {
    const db = new PalierDb(dbName());
    const store = dexieOralStore(db);
    await store.put(aSession);
    await store.putAudio(aSession.id, new Blob(["son"]));

    expect(await db.settings.count()).toBe(0);
    expect(await db.syncMeta.count()).toBe(0);
  });
});

describe("isQuotaError", () => {
  it.each([
    ["the browser's own error", new DOMException("full", "QuotaExceededError"), true],
    ["Dexie's wrapper, by its inner error", Object.assign(new Error("wrapped"), { name: "AbortError", inner: new DOMException("full", "QuotaExceededError") }), true],
    ["any other error", new Error("nope"), false],
    ["a wrapper around any other error", Object.assign(new Error("wrapped"), { inner: new Error("nope") }), false],
    ["something that is not an error", "QuotaExceededError", false],
  ])("recognises %s: %s", (_, error, expected) => {
    expect(isQuotaError(error)).toBe(expected);
  });
});
