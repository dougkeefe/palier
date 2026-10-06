import { anItem, generatedItemStoreContract } from "@palier/testing";
import { itemId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieGeneratedItemStore } from "./generated-item-store.js";

const dbName = (): string => `palier-generated-${globalThis.crypto.randomUUID()}`;

generatedItemStoreContract("dexie", () => Promise.resolve(dexieGeneratedItemStore(new PalierDb(dbName()))));

const item = anItem({ id: itemId("gen-01"), skill: "writing", type: "error-id", subSkill: "agreement" });
const aSet = { id: "set-1", skill: "writing" as const, createdAt: "2026-09-26T10:00:00.000Z", items: [item] };
const aRow = { id: item.id, skill: "writing", createdAt: aSet.createdAt, setId: "set-1", position: 0, item };

describe("dexieGeneratedItemStore", () => {
  it("survives a reopen, so a paid-for set outlives the tab", async () => {
    const name = dbName();
    await dexieGeneratedItemStore(new PalierDb(name)).putSet(aSet);

    expect(await dexieGeneratedItemStore(new PalierDb(name)).latestSet("writing")).toEqual(aSet);
  });

  it("writes one row per item into v1's generated table, with no schema bump", async () => {
    const db = new PalierDb(dbName());
    await dexieGeneratedItemStore(db).putSet(aSet);

    expect(db.verno).toBe(4);
    expect(await db.generated.toArray()).toEqual([aRow]);
  });

  it.each([
    ["no set id", { ...aRow, setId: "" }],
    ["a time that is not an instant", { ...aRow, createdAt: "2026-99" }],
    ["a position that is not a whole number", { ...aRow, position: 0.5 }],
    ["an item that is not a whole item", { ...aRow, item: { ...item, options: [] } }],
    ["an item under another id", { ...aRow, id: "gen-other" }],
    ["an item of another skill", { ...aRow, skill: "reading" }],
  ])("reads a row with %s as nothing", async (_, row) => {
    const db = new PalierDb(dbName());
    // Written straight to the table, as a row from an older or foreign build could be.
    await db.generated.put(row as never);
    const store = dexieGeneratedItemStore(db);

    expect(await store.latestSet("writing")).toBeNull();
    expect(await store.item(itemId(row.id))).toBeNull();
  });

  it("keeps its rows apart from the synced settings and the attempts", async () => {
    const db = new PalierDb(dbName());
    await dexieGeneratedItemStore(db).putSet(aSet);

    expect(await db.settings.toArray()).toEqual([]);
    expect(await db.attempts.toArray()).toEqual([]);
  });
});
