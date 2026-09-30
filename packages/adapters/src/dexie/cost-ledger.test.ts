import { costLedgerContract } from "@palier/testing";
import { describe, expect, it } from "vitest";

import { dexieCostLedger } from "./cost-ledger.js";
import { PalierDb } from "./db.js";

const dbName = (): string => `palier-ledger-${globalThis.crypto.randomUUID()}`;

costLedgerContract("dexie", () => Promise.resolve(dexieCostLedger(new PalierDb(dbName()))));

const anEntry = {
  ts: "2026-09-26T10:00:00.000Z",
  feature: "writing-feedback",
  model: "gpt-test",
  inputTokens: 1_000,
  outputTokens: 500,
  costUsd: 0.006,
} as const;

describe("dexieCostLedger", () => {
  it("survives a reopen, so the month's spend outlives the tab", async () => {
    const name = dbName();
    await dexieCostLedger(new PalierDb(name)).append(anEntry);

    expect(await dexieCostLedger(new PalierDb(name)).since("2026-09-01T00:00:00.000Z")).toEqual([anEntry]);
  });

  it.each([
    ["the placeholder a v1 device may hold", { ts: "2026-09-26T09:00:00.000Z", feature: "none" }],
    ["an unknown feature", { ...anEntry, feature: "oral-telepathy" }],
    ["a time that is not an instant", { ...anEntry, ts: "2026-99" }],
    ["a model that is not a name", { ...anEntry, model: 7 }],
    ["negative tokens", { ...anEntry, inputTokens: -1 }],
    ["tokens that are not a number", { ...anEntry, outputTokens: "500" }],
    ["a price that is not a number", { ...anEntry, costUsd: "0.01" }],
  ])("reads %s as nothing, never as a spend", async (_, row) => {
    const db = new PalierDb(dbName());
    await db.costLedger.add(row as never);
    await db.costLedger.add({ ...anEntry, ts: "2026-09-26T11:00:00.000Z" });

    const since = await dexieCostLedger(db).since("2026-09-01T00:00:00.000Z");
    expect(since).toEqual([{ ...anEntry, ts: "2026-09-26T11:00:00.000Z" }]);
  });

  it("stores the entry and nothing else: no field is added on the way in", async () => {
    const db = new PalierDb(dbName());
    await dexieCostLedger(db).append({ ...anEntry, extra: "not part of an entry" } as never);

    const [row] = await db.costLedger.toArray();
    expect(Object.keys(row ?? {}).sort()).toEqual(
      ["costUsd", "feature", "id", "inputTokens", "model", "outputTokens", "ts"].sort(),
    );
  });

  it("reads a session that is not an id as belonging to no session, and keeps the spend (D125)", async () => {
    const db = new PalierDb(dbName());
    await db.costLedger.add({ ...anEntry, sessionId: 7 } as never);
    await db.costLedger.add({ ...anEntry, sessionId: "" } as never);

    expect(await dexieCostLedger(db).since("2026-09-01T00:00:00.000Z")).toEqual([anEntry, anEntry]);
  });

  it("keeps its rows apart from the synced settings", async () => {
    const db = new PalierDb(dbName());
    await dexieCostLedger(db).append(anEntry);

    expect(await db.settings.toArray()).toEqual([]);
    expect(await db.costLedger.count()).toBe(1);
  });
});
