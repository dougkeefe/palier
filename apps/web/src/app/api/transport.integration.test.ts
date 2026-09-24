import { fileURLToPath } from "node:url";

import { httpSyncTransport } from "@palier/adapters/sync";
import { syncTransportContract } from "@palier/testing";
import { afterAll, beforeAll, vi } from "vitest";

import { resetDatabase } from "../../server/__tests__/reset";
import { pgliteDatabase } from "../../server/db";
import { drizzleSyncRepository } from "../../server/drizzle-repository";
import { type SyncApi, createSyncApi } from "../../server/handlers";
import { routeFetch } from "./__tests__/route-fetch";

/**
 * Tier 4 end to end: the HTTP adapter → the real route files → the handlers → Drizzle →
 * PGlite with the committed migrations, held to `syncTransportContract`
 * (implementation-plan.md §6.2: "sync against PGlite with the real Drizzle schema and
 * the real route handlers. No mocked database").
 */
const state = vi.hoisted(() => ({ api: null as SyncApi | null }));
vi.mock("../../server/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../server/db")>()),
  syncApi: () => Promise.resolve(state.api),
}));

const MIGRATIONS = fileURLToPath(new URL("../../../drizzle", import.meta.url));
let database: Awaited<ReturnType<typeof pgliteDatabase>>;

beforeAll(async () => {
  database = await pgliteDatabase(MIGRATIONS);
});
afterAll(async () => {
  await database.close();
});

syncTransportContract("http through the route handlers (Drizzle on PGlite)", async () => {
  await resetDatabase(database.db);
  state.api = createSyncApi({
    repo: drizzleSyncRepository(database.db),
    now: () => new Date(),
    randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
    rateLimitSalt: "salt",
  });
  const fetchImpl = await routeFetch();
  return (secret) =>
    httpSyncTransport({ baseUrl: "http://palier.test", credentials: () => Promise.resolve(secret), fetchImpl, retryDelayMs: 0 });
});
