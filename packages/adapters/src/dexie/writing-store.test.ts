import { writingStoreContract } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieWritingStore } from "./writing-store.js";

const dbName = (): string => `palier-writing-${globalThis.crypto.randomUUID()}`;

writingStoreContract("dexie", () => Promise.resolve(dexieWritingStore(new PalierDb(dbName()))));

const criterion = { band: "B", evidence: "e" } as const;
const anAssessment = {
  criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  errors: [{ start: 0, end: 7, correction: "Madame", rule: "r" }],
  modelAnswer: "Madame, je vous écris.",
};
const aSubmission = {
  id: "sub-1",
  promptId: "wp-reply-01",
  text: "Madamme, je vous écrit.",
  writtenAt: "2026-09-26T10:00:00.000Z",
  assessment: anAssessment,
};

describe("dexieWritingStore", () => {
  it("survives a reopen, so the writing outlives the tab", async () => {
    const name = dbName();
    await dexieWritingStore(new PalierDb(name)).put(aSubmission);

    expect(await dexieWritingStore(new PalierDb(name)).get("sub-1")).toEqual(aSubmission);
  });

  it.each([
    ["an empty id", { ...aSubmission, id: "" }],
    ["no prompt", { ...aSubmission, id: "bad", promptId: 3 }],
    ["a text that is not text", { ...aSubmission, id: "bad", text: null }],
    ["a time that is not an instant", { ...aSubmission, id: "bad", writtenAt: "2026-99" }],
    ["a time that is not a string", { ...aSubmission, id: "bad", writtenAt: 12 }],
  ])("reads a row with %s as nothing", async (_, row) => {
    const db = new PalierDb(dbName());
    // Written straight to the table, as a row from an older or foreign build could be.
    await db.writingSubmissions.put(row as never);
    await db.writingSubmissions.put({ ...aSubmission, id: "good" });
    const store = dexieWritingStore(db);

    expect((await store.all()).map((s) => s.id)).toEqual(["good"]);
    expect(await store.get(row.id as string)).toBeNull();
  });

  it.each([
    ["an assessment in the wrong shape", { modelAnswer: "only this" }],
    ["offsets past the end of the text", { ...anAssessment, errors: [{ start: 0, end: 99, correction: "c", rule: "r" }] }],
    [
      "overlapping offsets",
      {
        ...anAssessment,
        errors: [
          { start: 0, end: 5, correction: "c", rule: "r" },
          { start: 3, end: 8, correction: "c", rule: "r" },
        ],
      },
    ],
  ])("keeps the text but reads %s as unassessed", async (_, assessment) => {
    const db = new PalierDb(dbName());
    await db.writingSubmissions.put({ ...aSubmission, assessment } as never);

    expect(await dexieWritingStore(db).get("sub-1")).toEqual({ ...aSubmission, assessment: null });
  });

  it("stores the submission and nothing else: no field is added on the way in", async () => {
    const db = new PalierDb(dbName());
    await dexieWritingStore(db).put({ ...aSubmission, extra: "not part of a submission" } as never);

    const [row] = await db.writingSubmissions.toArray();
    expect(Object.keys(row ?? {}).sort()).toEqual(["assessment", "id", "promptId", "text", "writtenAt"]);
  });

  it("keeps its rows apart from the synced settings", async () => {
    const db = new PalierDb(dbName());
    await dexieWritingStore(db).put(aSubmission);

    expect(await db.settings.toArray()).toEqual([]);
    expect(await db.writingSubmissions.count()).toBe(1);
  });
});
