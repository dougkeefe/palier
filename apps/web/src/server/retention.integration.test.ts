import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "./__tests__/reset";
import { pgliteDatabase } from "./db";
import { type Query, retentionCutoffs, runRetention } from "./retention-job";

/**
 * Phase 7 Slice 2's *done* (progress.md D138): on the committed migrations, the job retires
 * exactly the rows past each boundary and none before it. The script runs these same
 * statements over postgres.js; here PGlite runs them.
 */
const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));
const NOW = new Date("2026-09-28T06:00:00.000Z");
const cutoffs = retentionCutoffs(NOW);

/** An instant `ms` either side of a cutoff. */
const shift = (iso: string, ms: number): string => new Date(new Date(iso).getTime() + ms).toISOString();
const JUST_BEFORE = -1;
const RECENT = "2026-09-27T12:00:00.000Z";
const LONG_AGO = "2025-01-01T00:00:00.000Z";

const ACCOUNT = {
  stale: "00000000-0000-4000-8000-000000000001",
  atBoundary: "00000000-0000-4000-8000-000000000002",
  pullOnly: "00000000-0000-4000-8000-000000000003",
  revokedOnly: "00000000-0000-4000-8000-000000000004",
  deviceAtBoundary: "00000000-0000-4000-8000-000000000005",
};

let database: Awaited<ReturnType<typeof pgliteDatabase>>;
let query: Query;

const run = async (text: string, params: readonly unknown[] = []) => {
  await database.client.query(text, [...params]);
};
const ids = async (text: string): Promise<string[]> =>
  (await database.client.query<{ id: string }>(text)).rows.map((row) => row.id);

const account = (id: string, lastActiveAt: string) =>
  run("insert into accounts (id, created_at, last_active_at) values ($1, $2, $2)", [id, lastActiveAt]);
const device = (id: string, accountId: string, lastSeenAt: string, revokedAt: string | null = null) =>
  run(
    "insert into devices (id, account_id, label, secret_hash, created_at, last_seen_at, revoked_at) values ($1, $2, 'L', $5, $3, $3, $4)",
    [id, accountId, lastSeenAt, revokedAt, `hash-${id}`],
  );
const document = (accountId: string, docId: string, updatedAt: string, deleted: boolean) =>
  run(
    "insert into sync_documents (account_id, doc_type, doc_id, payload, revision, updated_at, deleted) values ($1, 'attempt', $2, '{}', 1, $3, $4)",
    [accountId, docId, updatedAt, deleted],
  );

const seed = async () => {
  // An account idle for a millisecond past 180 days, with a device idle as long.
  await account(ACCOUNT.stale, shift(cutoffs.inactiveBefore, JUST_BEFORE));
  await device("10000000-0000-4000-8000-000000000001", ACCOUNT.stale, shift(cutoffs.inactiveBefore, JUST_BEFORE));
  await document(ACCOUNT.stale, "stale-doc", LONG_AGO, false);
  await run("insert into pair_codes (code_hash, account_id, expires_at) values ('stale-code', $1, $2)", [ACCOUNT.stale, "2026-12-01T00:00:00.000Z"]);

  // Last pushed exactly 180 days ago, its device seen no later: kept, on the account's own boundary.
  await account(ACCOUNT.atBoundary, cutoffs.inactiveBefore);
  await device("10000000-0000-4000-8000-000000000002", ACCOUNT.atBoundary, shift(cutoffs.inactiveBefore, JUST_BEFORE));

  // Pushed long ago, its device seen exactly 180 days ago: kept, on the device's boundary.
  await account(ACCOUNT.deviceAtBoundary, LONG_AGO);
  await device("10000000-0000-4000-8000-000000000005", ACCOUNT.deviceAtBoundary, cutoffs.inactiveBefore);

  // Never pushed since long ago, but a device pulled yesterday: in use, so kept.
  await account(ACCOUNT.pullOnly, LONG_AGO);
  await device("10000000-0000-4000-8000-000000000003", ACCOUNT.pullOnly, RECENT);

  // The only recently seen device was revoked: no activity, so deleted.
  await account(ACCOUNT.revokedOnly, LONG_AGO);
  await device("10000000-0000-4000-8000-000000000004", ACCOUNT.revokedOnly, RECENT, RECENT);

  // Tombstones on a kept account, either side of 90 days, and an old live document.
  await document(ACCOUNT.atBoundary, "tomb-old", shift(cutoffs.tombstonesBefore, JUST_BEFORE), true);
  await document(ACCOUNT.atBoundary, "tomb-at", cutoffs.tombstonesBefore, true);
  await document(ACCOUNT.atBoundary, "live-old", LONG_AGO, false);

  // Pair codes either side of their expiry.
  await run("insert into pair_codes (code_hash, account_id, expires_at) values ('expired', $1, $2)", [ACCOUNT.atBoundary, shift(cutoffs.pairCodesBefore, JUST_BEFORE)]);
  await run("insert into pair_codes (code_hash, account_id, expires_at) values ('expiring', $1, $2)", [ACCOUNT.atBoundary, cutoffs.pairCodesBefore]);

  // Rate-limit windows either side of a day.
  await run("insert into rate_limits (key, window_start, count) values ('old', $1, 3)", [shift(cutoffs.rateLimitsBefore, JUST_BEFORE)]);
  await run("insert into rate_limits (key, window_start, count) values ('current', $1, 3)", [cutoffs.rateLimitsBefore]);
};

beforeAll(async () => {
  database = await pgliteDatabase(MIGRATIONS);
  query = async (text, params) => (await database.client.query<Record<string, unknown>>(text, [...params])).rows;
});
afterAll(async () => {
  await database.close();
});
beforeEach(async () => {
  await resetDatabase(database.db);
  await seed();
});

const EXPECTED = { "inactive-accounts": 2, tombstones: 1, "expired-pair-codes": 1, "stale-rate-limits": 1 };

describe("the retention job on PGlite", () => {
  it("removes exactly the rows past each boundary, and none at or before it", async () => {
    const report = await runRetention({ query, now: NOW, planBytes: null, dryRun: false });

    expect(report.removed).toEqual(EXPECTED);
    expect(await ids("select id from accounts order by id")).toEqual([ACCOUNT.atBoundary, ACCOUNT.pullOnly, ACCOUNT.deviceAtBoundary]);
    expect(await ids("select doc_id as id from sync_documents order by doc_id")).toEqual(["live-old", "tomb-at"]);
    expect(await ids("select code_hash as id from pair_codes order by code_hash")).toEqual(["expiring"]);
    expect(await ids("select key as id from rate_limits order by key")).toEqual(["current"]);
  });

  it("takes a deleted account's devices, documents and pair codes with it, by cascade", async () => {
    await runRetention({ query, now: NOW, planBytes: null, dryRun: false });

    const stale = [ACCOUNT.stale, ACCOUNT.revokedOnly];
    for (const table of ["devices", "sync_documents", "pair_codes"]) {
      const { rows } = await database.client.query<{ n: number }>(
        `select count(*)::int as n from ${table} where account_id = any($1::uuid[])`,
        [stale],
      );
      expect(rows[0]?.n, table).toBe(0);
    }
  });

  it("deletes nothing in a dry run, and counts what it would", async () => {
    const report = await runRetention({ query, now: NOW, planBytes: null, dryRun: true });

    expect(report.removed).toEqual(EXPECTED);
    expect(await ids("select id from accounts")).toHaveLength(5);
    expect(await ids("select doc_id as id from sync_documents")).toHaveLength(4);
    expect(await ids("select code_hash as id from pair_codes")).toHaveLength(3);
    expect(await ids("select key as id from rate_limits")).toHaveLength(2);
  });

  it("removes nothing more on a second run the same instant", async () => {
    await runRetention({ query, now: NOW, planBytes: null, dryRun: false });
    const again = await runRetention({ query, now: NOW, planBytes: null, dryRun: false });

    expect(Object.values(again.removed)).toEqual([0, 0, 0, 0]);
  });

  it("reads the database's size, and judges it against the plan", async () => {
    const report = await runRetention({ query, now: NOW, planBytes: 1, dryRun: true });

    expect(report.databaseBytes).toBeGreaterThan(0);
    expect(report.verdict).toBe("upgrade");
  });
});
