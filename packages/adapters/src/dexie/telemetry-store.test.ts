import { telemetryStoreContract } from "@palier/testing";
import { itemId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieTelemetryStore } from "./telemetry-store.js";

const dbName = (): string => `palier-telemetry-${globalThis.crypto.randomUUID()}`;

telemetryStoreContract("dexie", () => Promise.resolve(dexieTelemetryStore(new PalierDb(dbName()))));

const anEvent = { itemId: itemId("fr-read-0001"), correct: true, responseMs: 900, bankVersion: 2, restBucket: 2 } as const;

describe("dexieTelemetryStore", () => {
  it("survives a reopen, queue and consent, so an exam submitted offline is still sent later", async () => {
    const name = dbName();
    const first = dexieTelemetryStore(new PalierDb(name));
    await first.setConsent("on");
    await first.enqueue([anEvent]);

    const reopened = dexieTelemetryStore(new PalierDb(name));
    expect(await reopened.consent()).toBe("on");
    expect((await reopened.take(10)).map((q) => q.event)).toEqual([anEvent]);
  });

  it("reads a damaged consent row as not asked, the safe reading", async () => {
    const db = new PalierDb(dbName());
    await db.telemetryMeta.put({ id: "consent", consent: "yes please" } as never);

    expect(await dexieTelemetryStore(db).consent()).toBe("unasked");
  });

  it("keeps its tables apart from the synced settings", async () => {
    const db = new PalierDb(dbName());
    await dexieTelemetryStore(db).setConsent("on");

    expect(await db.settings.toArray()).toEqual([]);
  });
});
