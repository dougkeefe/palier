import { aSession, sessionStoreContract } from "@palier/testing";
import { sessionId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { PalierDb } from "./db.js";
import { dexieSessionStore } from "./session-store.js";

const dbName = (): string => `palier-sessions-${globalThis.crypto.randomUUID()}`;

sessionStoreContract("dexie", () => Promise.resolve(dexieSessionStore(new PalierDb(dbName()))));

describe("dexieSessionStore", () => {
  it("survives a reopen and preserves the mode translated from the type column", async () => {
    const name = dbName();
    const first = dexieSessionStore(new PalierDb(name));
    await first.create(aSession({ id: sessionId("s-1"), mode: "diagnostic" }));

    const reopened = dexieSessionStore(new PalierDb(name));
    expect(await reopened.latest()).toMatchObject({ id: "s-1", mode: "diagnostic" });
  });
});
