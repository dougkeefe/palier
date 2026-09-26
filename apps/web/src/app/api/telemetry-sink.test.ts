import { httpTelemetrySink } from "@palier/adapters/telemetry";
import { telemetrySinkContract } from "@palier/testing";
import { vi } from "vitest";

import { memoryTelemetryRepository } from "../../server/__tests__/memory-telemetry-repository";
import { type TelemetryApi, createTelemetryApi } from "../../server/telemetry-handlers";

/**
 * The HTTP telemetry adapter held to `telemetrySinkContract` **through the real route
 * file and handler**, over the in-memory repository. This ties `@palier/testing`'s
 * `telemetryHandlers` copy of the protocol to the real one, as `transport.test.ts` does
 * for sync. "Unavailable" is the route with no database, which answers 503.
 */
const state = vi.hoisted(() => ({ api: null as TelemetryApi | null }));
vi.mock("../../server/db", () => ({ telemetryApi: () => Promise.resolve(state.api) }));

const { POST } = await import("./telemetry/route");

telemetrySinkContract("http through the route handler (memory repository)", () => {
  const repo = memoryTelemetryRepository();
  const api = createTelemetryApi({ repo, now: () => new Date(), rateLimitSalt: "salt" });
  state.api = api;
  const sink = httpTelemetrySink({
    baseUrl: "http://palier.test",
    fetchImpl: (url, init) => POST(new Request(url, init)),
  });
  return Promise.resolve({
    sink,
    received: () => repo.rows().map(({ receivedOn: _day, ...event }) => event),
    setAvailable: (available: boolean) => {
      state.api = available ? api : null;
    },
  });
});
