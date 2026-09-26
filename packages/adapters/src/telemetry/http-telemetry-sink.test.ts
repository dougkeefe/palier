import { TelemetryRejectedError, TelemetryUnavailableError } from "@palier/app";
import { itemId } from "@palier/domain";
import { memoryTelemetryCollector, mswServer, telemetryHandlers, telemetrySinkContract } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { type FetchLike, httpTelemetrySink } from "./http-telemetry-sink.js";

const BASE = "http://telemetry.test";

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  mswServer.resetHandlers();
});
afterAll(() => {
  mswServer.close();
});

// The whole contract over the real `fetch` path via MSW, the suite the in-memory
// collector passes and that apps/web runs against its real route handler.
telemetrySinkContract("http over msw", () => {
  const collector = memoryTelemetryCollector();
  mswServer.use(...telemetryHandlers(collector, { baseUrl: BASE }));
  return Promise.resolve({ ...collector, sink: httpTelemetrySink({ baseUrl: BASE }) });
});

const batch = [{ itemId: itemId("fr-read-0001"), correct: true, responseMs: 900, bankVersion: 2, restBucket: 2 }] as const;

/** A scripted `fetch` answering every call with `status`, or failing like a dropped network. */
const scripted = (status: number | "offline") => {
  const calls: { url: string; init: Parameters<FetchLike>[1] }[] = [];
  const fetchImpl: FetchLike = (url, init) => {
    calls.push({ url, init });
    if (status === "offline") return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve({ ok: status >= 200 && status < 300, status });
  };
  return { sink: httpTelemetrySink({ baseUrl: BASE, fetchImpl }), calls };
};

describe("httpTelemetrySink — the request", () => {
  it("posts the batch as { events } with no credential and no cookie", async () => {
    const { sink, calls } = scripted(202);

    await sink.send(batch);

    expect(calls).toEqual([
      {
        url: `${BASE}/api/telemetry`,
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ events: batch }),
          credentials: "omit",
        },
      },
    ]);
  });
});

describe("httpTelemetrySink — error translation", () => {
  it("turns an unreachable network into TelemetryUnavailableError", async () => {
    await expect(scripted("offline").sink.send(batch)).rejects.toThrow(TelemetryUnavailableError);
  });

  it("turns a rate limit or a server failure into TelemetryUnavailableError", async () => {
    for (const status of [429, 500, 503]) {
      await expect(scripted(status).sink.send(batch)).rejects.toThrow(TelemetryUnavailableError);
    }
  });

  it("turns a refusal of the batch itself into TelemetryRejectedError, with its status", async () => {
    for (const status of [400, 413]) {
      await expect(scripted(status).sink.send(batch)).rejects.toMatchObject({ name: "TelemetryRejectedError", status });
    }
    await expect(scripted(400).sink.send(batch)).rejects.toBeInstanceOf(TelemetryRejectedError);
  });
});
