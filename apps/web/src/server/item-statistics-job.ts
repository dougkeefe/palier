import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { httpBankRepository } from "@palier/adapters/bank";
import type { ExamProfile, Item, ItemStatisticsReport, TelemetryEvent } from "@palier/domain";
import { itemId, telemetryEventSchema } from "@palier/domain";
import { itemStatistics, retirementVerdicts } from "@palier/engine";

/**
 * The monthly item-statistics job (architecture.md §7.6, progress.md D94): read every
 * telemetry event, compute each item's proportion correct and point-biserial, judge them
 * against the profile's retirement rules, and write `content/factory/item-statistics.json`.
 * A workflow opens that file as a pull request; nothing is retired without review.
 *
 * **Self-contained on purpose**, like `migrate.ts`: package imports only, and `postgres`
 * imported dynamically, so `scripts/item-statistics.mjs` can run it under Node's type
 * stripping, which does not resolve an extensionless relative import.
 *
 * `apps/factory` may not import the engine (§3.1), which is why the job lives here and
 * the factory only reads the report it writes.
 */

/**
 * The one query that reads the events, shared by the Drizzle repository and the
 * script, so the two cannot read different columns.
 */
export const EVENTS_SQL =
  "select item_id, correct, response_ms, rest_bucket, bank_version from telemetry_events order by id";

/** The rows of a query result: postgres.js answers with the rows, PGlite with `{ rows }`. */
export const rowsOf = (result: unknown): readonly Record<string, unknown>[] =>
  (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as Record<string, unknown>[];

/**
 * Rows as either driver returns them, parsed back into events. A row the schema refuses
 * throws: the route validated every one on the way in, so a bad row is a defect worth
 * stopping the job for, not a statistic to quietly skip.
 */
export const eventsFromRows = (rows: readonly Record<string, unknown>[]): readonly TelemetryEvent[] =>
  rows.map((row) => {
    const event = telemetryEventSchema.parse({
      itemId: row.item_id,
      correct: row.correct,
      responseMs: Number(row.response_ms),
      bankVersion: Number(row.bank_version),
      restBucket: Number(row.rest_bucket),
    });
    return { ...event, itemId: itemId(event.itemId) };
  });

export type ReportInput = {
  readonly events: readonly TelemetryEvent[];
  /** Every item in the bank the verdicts are judged against. */
  readonly items: readonly Item[];
  readonly bankVersion: number;
  readonly profile: ExamProfile;
  readonly generatedAt: string;
};

/** The report, from events and a bank. Pure. */
export const buildReport = (input: ReportInput): ItemStatisticsReport => ({
  generatedAt: input.generatedAt,
  bankVersion: input.bankVersion,
  events: input.events.length,
  rules: input.profile.itemStatistics,
  verdicts: retirementVerdicts(itemStatistics(input.events), input.items, input.profile.itemStatistics),
});

/**
 * The bank's items, read from the committed files through the same adapter the app
 * reads them with (`@palier/adapters/bank`), over a file-backed `fetch`. So the job
 * parses the bank exactly as a device does, and no second bank loader exists.
 */
export const bankItems = async (
  contentDir: string,
  version: number,
  ids: readonly string[],
): Promise<readonly Item[]> => {
  const bank = httpBankRepository({
    baseUrl: "",
    version,
    fetchImpl: async (url) => {
      const text = await readFile(join(contentDir, url), "utf8").catch(() => null);
      return text === null
        ? { ok: false, status: 404, json: () => Promise.resolve(null) }
        : { ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text) as unknown) };
    },
  });
  return bank.byIds(ids.map(itemId));
};

export type RunInput = {
  readonly readEvents: () => Promise<readonly TelemetryEvent[]>;
  /** The `content/` directory, holding `bank/v{n}/`. */
  readonly contentDir: string;
  readonly bankVersion: number;
  readonly profile: ExamProfile;
  readonly now: () => Date;
};

/** The whole job: read the events, look their items up in the bank, and judge them. */
export const runItemStatistics = async (input: RunInput): Promise<ItemStatisticsReport> => {
  const events = await input.readEvents();
  const items = await bankItems(input.contentDir, input.bankVersion, [...new Set(events.map((event) => event.itemId))]);
  return buildReport({
    events,
    items,
    bankVersion: input.bankVersion,
    profile: input.profile,
    generatedAt: input.now().toISOString(),
  });
};

/** The report as committed: two-space JSON with a trailing newline, so a rerun diffs cleanly. */
export const reportText = (report: ItemStatisticsReport): string => `${JSON.stringify(report, null, 2)}\n`;

/**
 * Read every event over postgres.js. No branch, so its first real run is the first
 * scheduled job, as `applyWithPostgres`'s was the first deploy.
 */
export const readEventsWithPostgres = async (url: string): Promise<readonly TelemetryEvent[]> => {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    return eventsFromRows(await sql.unsafe(EVENTS_SQL));
  } finally {
    await sql.end();
  }
};
