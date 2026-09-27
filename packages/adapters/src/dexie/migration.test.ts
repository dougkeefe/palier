import { anAttempt, anExamRun, anItem, aScheduleEntry, aSession } from "@palier/testing";
import { attemptId, itemId, scenarioId, sessionId } from "@palier/domain";
import { Dexie } from "dexie";
import { describe, expect, it } from "vitest";

import { PalierDb, SCHEMA_V1, SCHEMA_V2 } from "./db.js";
import { dexieStores } from "./index.js";

/**
 * The migration harness (implementation-plan.md §6.2: "migration from schema version N
 * to N+1 with realistic data"). A database is opened exactly as a v1 build of the app
 * opened it, filled with the rows a real device holds, closed, and reopened by today's
 * `PalierDb`. Every row must survive, and the new tables must work.
 *
 * Each version keeps its own case: a v1 device upgrades straight to today's version, and
 * so does a v2 one (progress.md D106), so both paths are held.
 */
const dbName = (): string => `palier-migration-${globalThis.crypto.randomUUID()}`;

/** Open `name` as the app did at schema version 1, and fill it. */
const aVersionOneDevice = async (name: string) => {
  const v1 = new Dexie(name);
  v1.version(1).stores(SCHEMA_V1);
  const rows = {
    attempts: [anAttempt({ id: attemptId("att-1") }), anAttempt({ id: attemptId("att-2"), skill: "writing" })],
    schedule: [aScheduleEntry({ itemId: itemId("item-1") }), aScheduleEntry({ itemId: itemId("item-2"), due: null, box: 5 })],
    sessions: [{ id: aSession().id, type: "drill", startedAt: "2026-09-20T10:00:00.000Z", completedAt: null }],
    examRuns: [anExamRun()],
    settings: [{ key: "studyProfile", value: { skill: "reading", minutes: 20 } }],
    keyVault: [{ id: "device-secret", bytes: new Uint8Array([1, 2, 3]) }],
    syncMeta: [{ id: "state", identity: null, watermark: 7, enabled: true, lastSyncedAt: null, accountUnconfirmed: false }],
    costLedger: [{ ts: "2026-09-20T10:00:00.000Z", feature: "none" }],
    generated: [{ id: "gen-legacy", skill: "writing", createdAt: "2026-09-20T10:00:00.000Z" }],
    oralSessions: [{ id: "oral-legacy", scenarioId: "scn-legacy", startedAt: "2026-09-20T10:00:00.000Z" }],
    oralAudio: [{ sessionId: "oral-legacy" }],
  } as const;
  for (const [table, list] of Object.entries(rows)) await v1.table(table).bulkAdd([...list]);
  v1.close();
  return rows;
};

describe("schema migration v1 → current", () => {
  it("keeps every row a v1 device held", async () => {
    const name = dbName();
    const rows = await aVersionOneDevice(name);

    const db = new PalierDb(name);
    await db.open();
    expect(db.verno).toBe(3);
    for (const [table, list] of Object.entries(rows)) {
      expect(await db.table(table).count(), table).toBe(list.length);
    }
    expect(await db.examRuns.toArray()).toEqual(rows.examRuns);
    expect(await db.settings.toArray()).toEqual(rows.settings);
  });

  it("reads the migrated rows through the ports, and the new store starts empty and unasked", async () => {
    const name = dbName();
    await aVersionOneDevice(name);

    const stores = dexieStores(name);
    expect(await stores.attempts.all()).toHaveLength(2);
    expect(await stores.settings.get("studyProfile")).toEqual({ skill: "reading", minutes: 20 });
    expect((await stores.syncState.state()).watermark).toBe(7);
    expect(await stores.telemetry.consent()).toBe("unasked");
    expect(await stores.telemetry.take(10)).toEqual([]);
    // v1's placeholder ledger row survives the upgrade (the count above) but is not an
    // entry, so it reads as no spend at all (D101).
    expect(await stores.costLedger.since("1970-01-01T00:00:00.000Z")).toEqual([]);
    // Likewise a `generated` row that is not a whole item reads as no set (D110).
    expect(await stores.generated.latestSet("writing")).toBeNull();
    // And v1's placeholder oral rows, not a whole session or recording, read as none (D115).
    expect(await stores.oral.all()).toEqual([]);
    expect(await stores.oral.audioIndex()).toEqual([]);
  });

  it("gives the migrated database a working oral store in v1's own tables", async () => {
    const name = dbName();
    await aVersionOneDevice(name);

    const stores = dexieStores(name);
    const session = {
      id: sessionId("oral-1"),
      scenarioId: scenarioId("scn-1"),
      startedAt: "2026-09-27T10:00:00.000Z",
      endedAt: null,
      endReason: null,
      turns: [{ speaker: "examiner", text: "Bonjour.", phase: 0, startMs: 0, endMs: 900 }],
    } as const;
    await stores.oral.put(session);
    await stores.oral.putAudio(session.id, new Blob(["son"]));
    expect(await stores.oral.all()).toEqual([session]);
    expect(await stores.oral.audioIndex()).toEqual([{ sessionId: session.id, bytes: 3, startedAt: session.startedAt }]);
  });

  it("gives the migrated database a working generated-item store in v1's own table", async () => {
    const name = dbName();
    await aVersionOneDevice(name);

    const stores = dexieStores(name);
    const set = { id: "set-1", skill: "writing", createdAt: "2026-09-26T10:00:00.000Z", items: [anItem({ id: itemId("gen-1"), skill: "writing", type: "error-id", subSkill: "agreement" })] } as const;
    await stores.generated.putSet(set);
    expect(await stores.generated.latestSet("writing")).toEqual(set);
  });

  it("gives the migrated database a working cost ledger in v1's own table", async () => {
    const name = dbName();
    await aVersionOneDevice(name);

    const stores = dexieStores(name);
    const entry = {
      ts: "2026-09-26T10:00:00.000Z",
      feature: "item-generation",
      model: "m",
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0.001,
    } as const;
    await stores.costLedger.append(entry);
    expect(await stores.costLedger.since("2026-09-01T00:00:00.000Z")).toEqual([entry]);
  });

  it("gives the new tables to the migrated database", async () => {
    const name = dbName();
    await aVersionOneDevice(name);

    const stores = dexieStores(name);
    await stores.telemetry.setConsent("on");
    await stores.telemetry.enqueue([{ itemId: itemId("item-1"), correct: true, responseMs: 1, bankVersion: 2, restBucket: 0 }]);
    expect(await stores.telemetry.take(10)).toHaveLength(1);
  });
});

/** Open `name` as the app did at schema version 2, and fill it: v1's rows plus telemetry. */
const aVersionTwoDevice = async (name: string) => {
  const v1Rows = await aVersionOneDevice(name);
  const v2 = new Dexie(name);
  v2.version(1).stores(SCHEMA_V1);
  v2.version(2).stores(SCHEMA_V2);
  const rows = {
    ...v1Rows,
    costLedger: [
      ...v1Rows.costLedger,
      {
        ts: "2026-09-26T10:00:00.000Z",
        feature: "writing-feedback",
        model: "gpt-6-sol",
        inputTokens: 2_500,
        outputTokens: 2_000,
        costUsd: 0.021,
      },
    ],
    telemetryQueue: [{ event: { itemId: itemId("item-1"), correct: false, responseMs: 4_200, bankVersion: 2, restBucket: 1 } }],
    telemetryMeta: [{ id: "consent", consent: "on" }],
  } as const;
  await v2.table("costLedger").add(rows.costLedger[1]);
  await v2.table("telemetryQueue").bulkAdd([...rows.telemetryQueue]);
  await v2.table("telemetryMeta").bulkAdd([...rows.telemetryMeta]);
  v2.close();
  return rows;
};

describe("schema migration v2 → v3", () => {
  it("keeps every row a v2 device held", async () => {
    const name = dbName();
    const rows = await aVersionTwoDevice(name);

    const db = new PalierDb(name);
    await db.open();
    expect(db.verno).toBe(3);
    for (const [table, list] of Object.entries(rows)) {
      expect(await db.table(table).count(), table).toBe(list.length);
    }
    expect(await db.telemetryMeta.toArray()).toEqual(rows.telemetryMeta);
  });

  it("reads the migrated rows through the ports, and the writing store starts empty", async () => {
    const name = dbName();
    await aVersionTwoDevice(name);

    const stores = dexieStores(name);
    expect(await stores.telemetry.consent()).toBe("on");
    expect(await stores.telemetry.take(10)).toHaveLength(1);
    expect(await stores.costLedger.since("2026-09-01T00:00:00.000Z")).toHaveLength(1);
    expect(await stores.writing.all()).toEqual([]);
  });

  it("gives the migrated database a working writing store", async () => {
    const name = dbName();
    await aVersionTwoDevice(name);

    const stores = dexieStores(name);
    const submission = {
      id: "sub-1",
      promptId: "wp-reply-01",
      text: "Madame, je vous remercie de votre message.",
      writtenAt: "2026-09-26T11:00:00.000Z",
      assessment: null,
    };
    await stores.writing.put(submission);
    expect(await stores.writing.all()).toEqual([submission]);
  });
});
