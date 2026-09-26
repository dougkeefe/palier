import { TELEMETRY_MAX_BATCH } from "@palier/app";
import { itemId, telemetryEventSchema } from "@palier/domain";
import { z } from "zod";

import { clientIp, handle, readJson, refuse } from "./http";
import { rateLimitKey } from "./secrets";
import type { TelemetryRepository } from "./telemetry-repository";

/**
 * `POST /api/telemetry` (architecture.md §10, progress.md D93): opt-in anonymous item
 * outcomes, in batches.
 *
 * - **No credential.** Telemetry is detached from any account or device (PRD §15), so
 *   there is nothing to authenticate and nothing is looked up.
 * - **Every event is validated** by the domain's strict schema: exactly five fields, so
 *   an event carrying an identity is refused, not stored. At most `TELEMETRY_MAX_BATCH`
 *   events a batch, the client's own cap; more is 413, and so is a body over 64 KB.
 * - **Rate-limited per IP hash**, generously, because government offices share egress
 *   addresses. The IP is only ever hashed into the key; it is never stored.
 * - **202** once stored: accepted, and nothing to say back.
 */

/** 200 events at about 110 bytes each, with room to spare. */
export const MAX_TELEMETRY_BODY_BYTES = 64 * 1024;

/** Batches per window, per IP hash. A pilot of 30 behind one address stays far inside it. */
export const TELEMETRY_RATE_LIMIT = { max: 120, windowMs: 60 * 60 * 1000 } as const;

export type TelemetryApiDeps = {
  readonly repo: TelemetryRepository;
  readonly now: () => Date;
  /** The server secret the IP hash is keyed with. */
  readonly rateLimitSalt: string;
};

export type TelemetryApi = {
  readonly record: (request: Request) => Promise<Response>;
};

const batchBody = z.strictObject({ events: z.array(telemetryEventSchema).min(1) });

export const createTelemetryApi = (deps: TelemetryApiDeps): TelemetryApi => ({
  record: handle(async (request) => {
    const { events } = await readJson(request, batchBody, MAX_TELEMETRY_BODY_BYTES);
    if (events.length > TELEMETRY_MAX_BATCH) refuse("too-many-events", 413);

    const now = deps.now();
    const { max, windowMs } = TELEMETRY_RATE_LIMIT;
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
    const count = await deps.repo.hit(rateLimitKey(deps.rateLimitSalt, "telemetry", clientIp(request), now), windowStart);
    if (count > max) refuse("rate-limited", 429);

    // The day only: two rows cannot be linked by when they arrived.
    const branded = events.map((event) => ({ ...event, itemId: itemId(event.itemId) }));
    await deps.repo.insertEvents(branded, now.toISOString().slice(0, 10));
    return new Response(null, { status: 202 });
  }),
});
