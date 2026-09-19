import { PGlite } from "@electric-sql/pglite";

/**
 * Embedded Postgres in WASM for the sync integration tests
 * (implementation-plan.md 6.1). It starts in milliseconds and needs no Docker,
 * which is what lets the medium lane hold a four-minute budget. Real Postgres
 * via Testcontainers is a nightly concern.
 */
export type PgHarness = {
  readonly db: PGlite;
  close: () => Promise<void>;
};

export const createPgHarness = async (): Promise<PgHarness> => {
  const db = new PGlite();
  await db.waitReady;
  return { db, close: () => db.close() };
};
