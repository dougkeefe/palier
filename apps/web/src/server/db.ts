import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { isHermetic } from "@palier/testing/in-memory";

import { drizzleSyncRepository } from "./drizzle-repository";
import { type SyncApi, createSyncApi } from "./handlers";

/**
 * The server's one composition point (implementation-plan.md §3.5's rule, applied to the
 * server half; the browser half is `src/lib/container.ts`, and D59 says the two cannot be
 * one graph). It names the concrete database and nothing else does.
 *
 * - **Hermetic** (`PALIER_HERMETIC=1`, the Playwright lane): an in-process PGlite with the
 *   real migrations applied, so E2E journey 8 runs the real route handlers and the real
 *   SQL with no database to provision (implementation-plan.md §6.2 tier 6).
 * - **Production**: postgres.js over `DATABASE_URL` (serverless Postgres, "Neon or
 *   equivalent", architecture.md §3; the provider is chosen at deploy, Slice 3).
 * - **Neither**: `null`, which every route answers with 503. The client reads that as
 *   "sync unavailable" and says so quietly; study is never interrupted (§11).
 *
 * The API is memoised on `globalThis`, not in a module variable, because a dev server may
 * evaluate this module more than once, and a second PGlite would be a second,
 * empty database.
 */

export type ServerEnv = Record<string, string | undefined>;

/** Where the committed migrations live: `apps/web/drizzle`, the cwd of `next dev`/`next start`. */
export const migrationsFolder = (): string => join(process.cwd(), "drizzle");

/** A fresh PGlite with the migrations applied. Shared by the hermetic server and the integration tests. */
export const pgliteDatabase = async (folder: string) => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: folder });
  return { db, close: () => client.close() };
};

const salt = (env: ServerEnv): string => env.RATE_LIMIT_SALT ?? randomBytes(32).toString("hex");

const build = async (env: ServerEnv): Promise<SyncApi | null> => {
  const deps = { now: () => new Date(), randomBytes: (n: number) => new Uint8Array(randomBytes(n)), rateLimitSalt: salt(env) };
  if (isHermetic(env)) {
    const { db } = await pgliteDatabase(migrationsFolder());
    return createSyncApi({ ...deps, repo: drizzleSyncRepository(db) });
  }
  const url = env.DATABASE_URL;
  if (url === undefined || url === "") return null;
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // `prepare: false`: a serverless pooler (Neon's, PgBouncer) does not keep prepared statements.
  return createSyncApi({ ...deps, repo: drizzleSyncRepository(drizzle(postgres(url, { prepare: false }))) });
};

const cache = globalThis as { __palierSyncApi?: Promise<SyncApi | null> };

export const syncApi = (env: ServerEnv = process.env): Promise<SyncApi | null> => {
  cache.__palierSyncApi ??= build(env);
  return cache.__palierSyncApi;
};

/** Forget the memoised API — for tests that build it under a different environment. */
export const resetSyncApi = (): void => {
  delete cache.__palierSyncApi;
};
