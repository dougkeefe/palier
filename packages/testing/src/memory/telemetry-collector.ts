import type { TelemetrySink } from "@palier/app";
import { TelemetryUnavailableError } from "@palier/app";
import type { TelemetryEvent } from "@palier/domain";

/**
 * The receiving end of telemetry, in memory: what `POST /api/telemetry` would store,
 * and a `sink` that delivers to it. `setAvailable(false)` stands in for the network
 * being down or the service refusing, so a test can watch a batch wait and then
 * arrive.
 */
export type MemoryTelemetryCollector = {
  readonly sink: TelemetrySink;
  /** Store a batch, as the route would; false when the service is unavailable. */
  readonly accept: (batch: readonly TelemetryEvent[]) => boolean;
  readonly received: () => readonly TelemetryEvent[];
  readonly batches: () => number;
  readonly setAvailable: (available: boolean) => void;
};

export const memoryTelemetryCollector = (): MemoryTelemetryCollector => {
  const received: TelemetryEvent[] = [];
  let batches = 0;
  let available = true;

  const accept = (batch: readonly TelemetryEvent[]): boolean => {
    if (!available) return false;
    received.push(...batch);
    batches += 1;
    return true;
  };

  return {
    sink: {
      send: (batch) =>
        accept(batch) ? Promise.resolve() : Promise.reject(new TelemetryUnavailableError("the service is unavailable")),
    },
    accept,
    received: () => [...received],
    batches: () => batches,
    setAvailable: (value) => {
      available = value;
    },
  };
};
