import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { rateLimitHit } from "./drizzle-repository";
import { EVENTS_SQL, eventsFromRows, rowsOf } from "./item-statistics-job";
import { telemetryEvents } from "./schema";
import type { TelemetryRepository } from "./telemetry-repository";

/**
 * `TelemetryRepository` over Drizzle, for postgres.js and PGlite alike (the sync
 * repository's pattern). Reads go through the job's own query, so the integration lane
 * reads events exactly as the scheduled job does.
 */
export const drizzleTelemetryRepository = <H extends PgQueryResultHKT>(db: PgDatabase<H>): TelemetryRepository => ({
  insertEvents: async (events, receivedOn) => {
    await db.insert(telemetryEvents).values(
      events.map((event) => ({
        itemId: event.itemId,
        correct: event.correct,
        responseMs: event.responseMs,
        restBucket: event.restBucket,
        bankVersion: event.bankVersion,
        receivedOn,
      })),
    );
  },
  events: async () => eventsFromRows(rowsOf(await db.execute(sql.raw(EVENTS_SQL)))),
  hit: rateLimitHit(db),
});
