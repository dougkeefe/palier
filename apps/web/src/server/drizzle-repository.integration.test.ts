import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { syncRepositoryContract } from "./__tests__/repository.contract";
import { resetDatabase } from "./__tests__/reset";
import { pgliteDatabase, resetSyncApi, syncApi } from "./db";
import { drizzleSyncRepository } from "./drizzle-repository";

/**
 * Tier 4 (implementation-plan.md §6.2): the Drizzle repository against PGlite with the
 * **committed migrations** — the real schema, no mocked database — held to the same
 * contract the fast lane's in-memory repository passes.
 */
const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));

let database: Awaited<ReturnType<typeof pgliteDatabase>>;

beforeAll(async () => {
  database = await pgliteDatabase(MIGRATIONS);
});
afterAll(async () => {
  await database.close();
});

syncRepositoryContract("drizzle on PGlite", async () => {
  await resetDatabase(database.db);
  return drizzleSyncRepository(database.db);
});

describe("drizzleSyncRepository on PGlite", () => {
  it("serialises two concurrent pushes to one account, so revisions never repeat", async () => {
    await resetDatabase(database.db);
    const repo = drizzleSyncRepository(database.db);
    const { accountId, deviceId } = await repo.createAccount({ hash: "h", label: "L", at: "2026-09-24T12:00:00.000Z" });
    const batch = (prefix: string) =>
      Array.from({ length: 20 }, (_, i) => ({ type: "attempt" as const, id: `${prefix}${String(i)}`, baseRevision: null, payload: { i } }));

    const [a, b] = await Promise.all([
      repo.push(accountId, deviceId, batch("a"), "2026-09-24T12:00:00.000Z"),
      repo.push(accountId, deviceId, batch("b"), "2026-09-24T12:00:00.000Z"),
    ]);

    const revisions = [...a.accepted, ...b.accepted].map((x) => x.revision).sort((x, y) => x - y);
    expect(revisions).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });
});

describe("syncApi, hermetic", () => {
  it("serves the real handlers over an in-process PGlite with the migrations applied", async () => {
    const previous = process.cwd();
    process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
    try {
      const api = await syncApi({ PALIER_HERMETIC: "1" });
      const res = await api?.registerDevice(
        new Request("http://palier.test/api/account/device", {
          method: "POST",
          headers: { authorization: `Bearer ${"a".repeat(64)}` },
          body: JSON.stringify({ label: "Laptop" }),
        }),
      );

      expect(res?.status).toBe(200);
    } finally {
      process.chdir(previous);
      resetSyncApi();
    }
  });
});
