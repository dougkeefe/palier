import type { TelemetryEvent } from "@palier/domain";

/**
 * The telemetry backend's one door to its database (architecture.md §9.2, progress.md
 * D93). Separate from `SyncRepository` on purpose: that one can only ever read one
 * account's records, and telemetry has no accounts at all — the statistics job reads
 * every event, and no event can be traced to anyone.
 *
 * - `insertEvents` stores a validated batch, stamped with the day it arrived only.
 * - `events` reads every stored event, for the statistics job.
 * - `hit` counts one rate-limit hit, as `SyncRepository.hit` does, on the same table.
 */
export type TelemetryRepository = {
  insertEvents: (events: readonly TelemetryEvent[], receivedOn: string) => Promise<void>;
  events: () => Promise<readonly TelemetryEvent[]>;
  hit: (key: string, windowStart: string) => Promise<number>;
};
