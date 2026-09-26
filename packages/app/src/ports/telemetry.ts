import type { TelemetryEvent } from "@palier/domain";

/**
 * Opt-in anonymous item telemetry (product-requirements.md §15, architecture.md §9.2),
 * as two ports. `implementation-plan.md` §3.3 wrote one, `TelemetrySink { record, flush }`,
 * and it is split here (progress.md D92): the queue must survive an offline submit, so it
 * lives in IndexedDB, and the batch goes out over `fetch`. One adapter directory cannot
 * hold both, because adapter directories never import each other. `record` and `flush`
 * became use cases over the pair (`use-cases/telemetry.ts`).
 */

/**
 * Whether this device shares telemetry. `"unasked"` until the post-exam prompt is
 * answered; dismissing the prompt is `"off"`. **Device-local, and never synced**: consent
 * given in one browser must not enrol another, and §15 keeps sync and telemetry apart.
 */
export type TelemetryConsent = "unasked" | "on" | "off";

export const TELEMETRY_CONSENTS: readonly TelemetryConsent[] = ["unasked", "on", "off"];

/** An event waiting to be sent, under the queue's own id. */
export type QueuedTelemetryEvent = {
  readonly id: number;
  readonly event: TelemetryEvent;
};

/**
 * The device-local half: the consent and the queue of events waiting for the network.
 * No sync collector reads it, and no export carries it, like `SyncStateStore`.
 *
 * - `consent` is `"unasked"` on a fresh device.
 * - `enqueue` appends, and `take` returns up to `limit` of the oldest, in order.
 * - `remove` drops the named entries; an unknown id is ignored.
 * - `clear` drops the queue **and** the consent, back to `"unasked"`.
 */
export type TelemetryStore = {
  consent: () => Promise<TelemetryConsent>;
  setConsent: (consent: TelemetryConsent) => Promise<void>;
  enqueue: (events: readonly TelemetryEvent[]) => Promise<void>;
  take: (limit: number) => Promise<readonly QueuedTelemetryEvent[]>;
  remove: (ids: readonly number[]) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * The network half: send one batch, at most `TELEMETRY_MAX_BATCH` events. It resolves
 * once the service has accepted the batch. It rejects with `TelemetryUnavailableError`
 * when the batch could not be delivered — offline, rate-limited, or no service — so the
 * caller keeps it for later; and with `TelemetryRejectedError` when the service refused
 * the batch itself, which no retry will change.
 */
export type TelemetrySink = {
  send: (batch: readonly TelemetryEvent[]) => Promise<void>;
};

/**
 * The most events one batch carries. The server refuses a larger batch, and it reads
 * this same constant, so the two cannot drift. A 65-item exam fits in one.
 */
export const TELEMETRY_MAX_BATCH = 200;

/** The batch could not be delivered this time; it stays queued. */
export class TelemetryUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Telemetry is unavailable: ${reason}.`);
    this.name = "TelemetryUnavailableError";
  }
}

/**
 * The service refused the batch as malformed. Sending it again would be refused again,
 * so the caller drops it rather than let one bad batch hold up the queue for good.
 */
export class TelemetryRejectedError extends Error {
  constructor(readonly status: number) {
    super(`The telemetry service refused a batch (HTTP ${String(status)}).`);
    this.name = "TelemetryRejectedError";
  }
}
