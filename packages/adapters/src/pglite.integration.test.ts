import { createPgHarness } from "@palier/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PgHarness } from "@palier/testing";

/**
 * Proves the PGlite harness starts, runs SQL and closes — the thing the sync
 * round-trip tests in phase 2 will be built on (implementation-plan.md 6.1).
 * It lives in the medium lane because starting Postgres, even in WASM, does not
 * belong inside a 90-second budget.
 */
describe("PGlite harness", () => {
  let harness: PgHarness;

  beforeAll(async () => {
    harness = await createPgHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  it("runs a query against an embedded Postgres", async () => {
    const result = await harness.db.query<{ answer: number }>("select 1 as answer");

    expect(result.rows[0]?.answer).toBe(1);
  });

  it("persists a table for the life of the harness", async () => {
    await harness.db.exec("create table attempt (id text primary key)");
    await harness.db.exec("insert into attempt (id) values ('a')");

    const result = await harness.db.query<{ id: string }>("select id from attempt");

    expect(result.rows).toEqual([{ id: "a" }]);
  });
});
