import { anAttempt, anExamRun, aScheduleEntry, aSession } from "@palier/testing";
import { attemptId, itemId } from "@palier/domain";
import { Dexie } from "dexie";
import { describe, expect, it } from "vitest";

import { PalierDb, SCHEMA_V1 } from "./db.js";
import { dexieStores } from "./index.js";

/**
 * The migration harness (implementation-plan.md §6.2: "migration from schema version N
 * to N+1 with realistic data"). A database is opened exactly as a v1 build of the app
 * opened it, filled with the rows a real device holds, closed, and reopened by today's
 * `PalierDb`. Every row must survive, and the new tables must work.
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
  } as const;
  for (const [table, list] of Object.entries(rows)) await v1.table(table).bulkAdd([...list]);
  v1.close();
  return rows;
};

describe("schema migration v1 → v2", () => {
  it("keeps every row a v1 device held", async () => {
    const name = dbName();
    const rows = await aVersionOneDevice(name);

    const db = new PalierDb(name);
    await db.open();
    expect(db.verno).toBe(2);
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
