import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/** Empty every server table, so each contract case starts from a fresh database. */
export const resetDatabase = async <H extends PgQueryResultHKT>(db: PgDatabase<H>): Promise<void> => {
  await db.execute(sql`truncate accounts, devices, sync_documents, pair_codes, rate_limits, telemetry_events cascade`);
};
