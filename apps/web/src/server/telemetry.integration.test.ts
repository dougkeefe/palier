import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { TELEMETRY_MAX_BATCH } from "@palier/app";
import { parseExamProfileOrThrow } from "@palier/domain";
import { syntheticTelemetry } from "@palier/testing";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resetDatabase } from "./__tests__/reset";
import { telemetryRepositoryContract } from "./__tests__/telemetry-repository.contract";
import { pgliteDatabase } from "./db";
import { drizzleTelemetryRepository } from "./drizzle-telemetry-repository";
import { buildReport } from "./item-statistics-job";
import { createTelemetryApi } from "./telemetry-handlers";

/**
 * Tier 4 for telemetry: the Drizzle repository on PGlite with the committed migrations,
 * held to the fast lane's contract; and Phase 3's exit criterion 3 end to end — synthetic
 * events posted through the real handler, stored by the real SQL, read back by the job's
 * own query, and judged.
 */
const MIGRATIONS = fileURLToPath(new URL("../../drizzle", import.meta.url));
const profile = parseExamProfileOrThrow(
  JSON.parse(readFileSync(createRequire(import.meta.url).resolve("@palier/content/profiles/psc-sle.json"), "utf8")),
);

let database: Awaited<ReturnType<typeof pgliteDatabase>>;

beforeAll(async () => {
  database = await pgliteDatabase(MIGRATIONS);
});
afterAll(async () => {
  await database.close();
});

telemetryRepositoryContract("drizzle on PGlite", async () => {
  await resetDatabase(database.db);
  return drizzleTelemetryRepository(database.db);
});

describe("telemetry on PGlite", () => {
  it("has exactly the seven columns the migration promises, none of which could identify anyone", async () => {
    const result = await database.db.execute(
      sql`select column_name from information_schema.columns where table_name = 'telemetry_events' order by column_name`,
    );
    const columns = (result as unknown as { rows: { column_name: string }[] }).rows.map((r) => r.column_name);
    expect(columns).toEqual(["bank_version", "correct", "id", "item_id", "received_on", "response_ms", "rest_bucket"]);
  });

  it("exit criterion 3: posted through the route, the job retires exactly the too-easy item and the reversed key", async () => {
    await resetDatabase(database.db);
    const repo = drizzleTelemetryRepository(database.db);
    const api = createTelemetryApi({ repo, now: () => new Date("2026-10-01T06:00:00.000Z"), rateLimitSalt: "salt" });
    const set = syntheticTelemetry();

    for (let start = 0; start < set.events.length; start += TELEMETRY_MAX_BATCH) {
      const events = set.events.slice(start, start + TELEMETRY_MAX_BATCH);
      const response = await api.record(
        new Request("http://palier.test/api/telemetry", {
          method: "POST",
          // Batches from many addresses, as a pilot's would arrive.
          headers: { "x-forwarded-for": `203.0.113.${String(start % 250)}` },
          body: JSON.stringify({ events }),
        }),
      );
      expect(response.status).toBe(202);
    }

    const stored = await repo.events();
    expect(stored).toEqual(set.events);

    const report = buildReport({ events: stored, items: set.items, bankVersion: 2, profile, generatedAt: "2026-10-01T06:00:00.000Z" });
    expect(report.verdicts.filter((v) => v.reasons.length > 0).map((v) => [v.itemId, v.reasons])).toEqual([
      [set.reversedKey, ["low-discrimination"]],
      [set.tooEasy, ["too-easy"]],
    ]);
  });
});
