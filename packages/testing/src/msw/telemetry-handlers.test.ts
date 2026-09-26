import { itemId } from "@palier/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { memoryTelemetryCollector } from "../memory/telemetry-collector.js";
import { mswServer } from "./node.js";
import { telemetryHandlers } from "./telemetry-handlers.js";

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

const events = [{ itemId: itemId("fr-read-0001"), correct: true, responseMs: 900, bankVersion: 2, restBucket: 2 }];
const post = () =>
  fetch(`${BASE}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events }) });

describe("telemetryHandlers — the wire protocol over a memory collector", () => {
  it("accepts a batch with 202 and no body, and the collector holds it", async () => {
    const collector = memoryTelemetryCollector();
    mswServer.use(...telemetryHandlers(collector, { baseUrl: BASE }));

    const response = await post();

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
    expect(collector.received()).toEqual(events);
    expect(collector.batches()).toBe(1);
  });

  it("answers 503 while the collector is unavailable, and holds nothing", async () => {
    const collector = memoryTelemetryCollector();
    collector.setAvailable(false);
    mswServer.use(...telemetryHandlers(collector, { baseUrl: BASE }));

    const response = await post();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "telemetry-unavailable" });
    expect(collector.received()).toEqual([]);
    expect(collector.batches()).toBe(0);
  });
});
