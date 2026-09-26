import type { TelemetryConsent, TelemetryStore } from "@palier/app";
import { TELEMETRY_CONSENTS } from "@palier/app";

import type { PalierDb } from "./db.js";

/**
 * The Dexie-backed `TelemetryStore` (schema version 2, progress.md D92): the queue of
 * events waiting for the network, in `telemetryQueue` under an auto-incremented key, so
 * primary-key order is arrival order; and the consent, one row in `telemetryMeta`.
 *
 * **Device-local by construction.** No sync collector reads these tables and no export
 * carries them, so a consent given here never enrols another browser.
 *
 * A consent row that is not one of the three values reads as `"unasked"`: the safe
 * reading of a damaged row is "not sharing", and the prompt asks again.
 */
export const dexieTelemetryStore = (db: PalierDb): TelemetryStore => ({
  consent: async () => {
    const consent = (await db.telemetryMeta.get("consent"))?.consent;
    return consent !== undefined && TELEMETRY_CONSENTS.includes(consent) ? consent : "unasked";
  },
  setConsent: async (consent: TelemetryConsent) => {
    await db.telemetryMeta.put({ id: "consent", consent });
  },
  enqueue: async (events) => {
    await db.telemetryQueue.bulkAdd(events.map((event) => ({ event })));
  },
  take: async (limit) =>
    (await db.telemetryQueue.limit(limit).toArray()).map((row) => ({ id: row.id as number, event: row.event })),
  remove: (ids) => db.telemetryQueue.bulkDelete([...ids]),
  clear: () =>
    db.transaction("rw", db.telemetryQueue, db.telemetryMeta, async () => {
      await db.telemetryQueue.clear();
      await db.telemetryMeta.clear();
    }),
});
