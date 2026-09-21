import { aScheduleEntry, scheduleStoreContract } from "@palier/testing";
import { itemId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieScheduleStore } from "./schedule-store.js";

const dbName = (): string => `palier-schedule-${globalThis.crypto.randomUUID()}`;

scheduleStoreContract("dexie", () => Promise.resolve(dexieScheduleStore(new PalierDb(dbName()))));

describe("dexieScheduleStore", () => {
  it("survives a reopen, retired entry and all", async () => {
    const name = dbName();
    const first = dexieScheduleStore(new PalierDb(name));
    await first.put(aScheduleEntry({ itemId: itemId("queued"), due: "2026-01-01T00:00:00.000Z" }));
    await first.put(aScheduleEntry({ itemId: itemId("retired"), due: null, box: 5 }));

    const reopened = dexieScheduleStore(new PalierDb(name));
    expect(await reopened.due("2099-01-01T00:00:00.000Z", 10)).toHaveLength(1);
    expect(await reopened.get(itemId("retired"))).toMatchObject({ due: null, box: 5 });
  });
});
