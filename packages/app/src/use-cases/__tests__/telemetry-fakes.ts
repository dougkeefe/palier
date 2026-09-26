import type { TelemetryEvent } from "@palier/domain";

import type {
  QueuedTelemetryEvent,
  TelemetryConsent,
  TelemetrySink,
  TelemetryStore,
} from "../../ports/index.js";

/**
 * Local telemetry stubs for the use-case tests (progress.md D37: `@palier/app`'s unit
 * tests do not import `@palier/testing`). The queue keeps an increasing id, as
 * Dexie's `++id` does.
 */
export const telemetryStore = (
  consent: TelemetryConsent = "unasked",
): TelemetryStore & { readonly queued: () => readonly TelemetryEvent[] } => {
  let current = consent;
  let next = 1;
  let queue: QueuedTelemetryEvent[] = [];
  return {
    consent: () => Promise.resolve(current),
    setConsent: (value) => {
      current = value;
      return Promise.resolve();
    },
    enqueue: (events) => {
      queue.push(...events.map((event) => ({ id: next++, event })));
      return Promise.resolve();
    },
    take: (limit) => Promise.resolve(queue.slice(0, limit)),
    remove: (ids) => {
      queue = queue.filter((queued) => !ids.includes(queued.id));
      return Promise.resolve();
    },
    clear: () => {
      queue = [];
      current = "unasked";
      return Promise.resolve();
    },
    queued: () => queue.map((queued) => queued.event),
  };
};

/** A sink that records each batch, and fails the calls named in `failures`, by index. */
export const sinkOf = (
  failures: ReadonlyMap<number, Error> = new Map(),
): TelemetrySink & { readonly batches: () => readonly (readonly TelemetryEvent[])[] } => {
  const batches: (readonly TelemetryEvent[])[] = [];
  let calls = 0;
  return {
    send: (batch) => {
      const failure = failures.get(calls);
      calls += 1;
      if (failure !== undefined) return Promise.reject(failure);
      batches.push(batch);
      return Promise.resolve();
    },
    batches: () => batches,
  };
};
