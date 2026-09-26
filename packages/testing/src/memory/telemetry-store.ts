import type { QueuedTelemetryEvent, TelemetryConsent, TelemetryStore } from "@palier/app";

/** The device-local consent and queue, in memory. Ids increase, as Dexie's `++id` does. */
export const memoryTelemetryStore = (): TelemetryStore => {
  let consent: TelemetryConsent = "unasked";
  let next = 1;
  let queue: QueuedTelemetryEvent[] = [];

  return {
    consent: () => Promise.resolve(consent),
    setConsent: (value) => {
      consent = value;
      return Promise.resolve();
    },
    enqueue: (events) => {
      queue.push(...events.map((event) => ({ id: next++, event })));
      return Promise.resolve();
    },
    take: (limit) => Promise.resolve(queue.slice(0, limit)),
    remove: (ids) => {
      const drop = new Set(ids);
      queue = queue.filter((queued) => !drop.has(queued.id));
      return Promise.resolve();
    },
    clear: () => {
      queue = [];
      consent = "unasked";
      return Promise.resolve();
    },
  };
};
