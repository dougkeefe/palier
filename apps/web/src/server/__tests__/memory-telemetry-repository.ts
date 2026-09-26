import type { TelemetryEvent } from "@palier/domain";

import type { TelemetryRepository } from "../telemetry-repository";

/** The telemetry repository in memory, for the fast lane. `rows` shows what was stored. */
export const memoryTelemetryRepository = (): TelemetryRepository & {
  readonly rows: () => readonly (TelemetryEvent & { readonly receivedOn: string })[];
} => {
  const rows: (TelemetryEvent & { receivedOn: string })[] = [];
  const rates = new Map<string, { windowStart: string; count: number }>();
  return {
    insertEvents: (events, receivedOn) => {
      rows.push(...events.map((event) => ({ ...event, receivedOn })));
      return Promise.resolve();
    },
    events: () => Promise.resolve(rows.map(({ receivedOn: _day, ...event }) => event)),
    hit: (key, windowStart) => {
      const row = rates.get(key);
      const count = row !== undefined && row.windowStart === windowStart ? row.count + 1 : 1;
      rates.set(key, { windowStart, count });
      return Promise.resolve(count);
    },
    rows: () => [...rows],
  };
};
