import { anAttempt, attemptStoreContract } from "@palier/testing";
import { attemptId } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { dexieAttemptStore } from "./attempt-store.js";
import { PalierDb } from "./db.js";

const dbName = (): string => `palier-attempts-${globalThis.crypto.randomUUID()}`;

attemptStoreContract("dexie", () => Promise.resolve(dexieAttemptStore(new PalierDb(dbName()))));

describe("dexieAttemptStore", () => {
  it("survives a reopen", async () => {
    const name = dbName();
    const first = dexieAttemptStore(new PalierDb(name));
    await first.append(anAttempt({ id: attemptId("a") }));

    const reopened = dexieAttemptStore(new PalierDb(name));
    expect(await reopened.recent("reading", 10)).toHaveLength(1);
  });

  it("returns an empty list for a non-positive count, never the whole store", async () => {
    const store = dexieAttemptStore(new PalierDb(dbName()));
    await store.append(anAttempt({ id: attemptId("a") }));
    await store.append(anAttempt({ id: attemptId("b") }));

    // `slice(-0)` would return every attempt, so the `n <= 0` guard is load-bearing.
    expect(await store.recent("reading", 0)).toEqual([]);
    expect(await store.recent("reading", -1)).toEqual([]);
  });

  it("rethrows a write error that is not a duplicate-id ConstraintError", async () => {
    const db = new PalierDb(dbName());
    const store = dexieAttemptStore(db);
    db.close(); // a write against a closed database fails, but not with ConstraintError

    await expect(store.append(anAttempt({ id: attemptId("a") }))).rejects.toThrow();
  });
});
