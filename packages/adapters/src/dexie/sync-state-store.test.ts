import { deviceId } from "@palier/app";
import { syncStateStoreContract } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieSyncStateStore } from "./sync-state-store.js";

const dbName = (): string => `palier-sync-${globalThis.crypto.randomUUID()}`;

syncStateStoreContract("dexie", () => Promise.resolve(dexieSyncStateStore(new PalierDb(dbName()))));

describe("dexieSyncStateStore", () => {
  it("survives a reopen, ledger and state both", async () => {
    const name = dbName();
    const first = dexieSyncStateStore(new PalierDb(name));
    await first.update({ identity: { accountId: "a", deviceId: deviceId("d") }, watermark: 4 });
    await first.record([{ type: "schedule", id: "item:with:colons", revision: 4, hash: "h" }]);

    const reopened = dexieSyncStateStore(new PalierDb(name));

    expect(await reopened.state()).toMatchObject({ watermark: 4, identity: { accountId: "a" } });
    expect(await reopened.ledger()).toEqual([{ type: "schedule", id: "item:with:colons", revision: 4, hash: "h" }]);
  });

  it("keeps its rows apart from the row ids the port never sees", async () => {
    const store = dexieSyncStateStore(new PalierDb(dbName()));
    await store.update({ watermark: 2 });

    expect(Object.keys(await store.state()).sort()).toEqual(["enabled", "identity", "lastSyncedAt", "watermark"]);
  });
});
