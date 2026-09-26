import { http, HttpResponse } from "msw";

import type { TelemetryEvent } from "@palier/domain";

import type { MemoryTelemetryCollector } from "../memory/telemetry-collector.js";

/**
 * MSW handlers that serve a `memoryTelemetryCollector` over the telemetry wire
 * protocol, so the HTTP `TelemetrySink` adapter is held to `telemetrySinkContract` —
 * the `syncHandlers` pattern, and a deliberate second copy of the protocol
 * `apps/web/src/app/api/telemetry` speaks.
 *
 * | Method and path | Body | Success |
 * | --- | --- | --- |
 * | `POST /api/telemetry` | `{ events }` | 202, no body |
 *
 * No credential: telemetry carries no identity. The collector being unavailable is a
 * 503. Validation is the real server's; this copy trusts its callers.
 */
export type TelemetryHandlerOptions = {
  readonly baseUrl: string;
};

export const telemetryHandlers = (collector: MemoryTelemetryCollector, options: TelemetryHandlerOptions) => [
  http.post(`${options.baseUrl}/api/telemetry`, async ({ request }) => {
    const { events } = (await request.json()) as { events: readonly TelemetryEvent[] };
    return collector.accept(events)
      ? new HttpResponse(null, { status: 202 })
      : HttpResponse.json({ error: "telemetry-unavailable" }, { status: 503 });
  }),
];
