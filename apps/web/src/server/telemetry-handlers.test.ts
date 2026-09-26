import { TELEMETRY_MAX_BATCH } from "@palier/app";
import { describe, expect, it } from "vitest";

import { memoryTelemetryRepository } from "./__tests__/memory-telemetry-repository";
import { telemetryRepositoryContract } from "./__tests__/telemetry-repository.contract";
import { rateLimitKey } from "./secrets";
import { MAX_TELEMETRY_BODY_BYTES, TELEMETRY_RATE_LIMIT, createTelemetryApi } from "./telemetry-handlers";

telemetryRepositoryContract("memory", () => Promise.resolve(memoryTelemetryRepository()));

const anEvent = (over: Record<string, unknown> = {}) => ({
  itemId: "fr-read-0001",
  correct: true,
  responseMs: 41_000,
  bankVersion: 2,
  restBucket: 3,
  ...over,
});

const post = (body: unknown, { ip = "203.0.113.7", raw }: { ip?: string; raw?: string } = {}) =>
  new Request("http://palier.test/api/telemetry", {
    method: "POST",
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: raw ?? JSON.stringify(body),
  });

const anApi = () => {
  const repo = memoryTelemetryRepository();
  const api = createTelemetryApi({ repo, now: () => new Date("2026-09-25T18:45:12.345Z"), rateLimitSalt: "salt" });
  return { api, repo };
};

const errorOf = async (response: Response) => ((await response.json()) as { error: string }).error;

describe("POST /api/telemetry", () => {
  it("stores a valid batch and answers 202 with no body", async () => {
    const { api, repo } = anApi();

    const response = await api.record(post({ events: [anEvent(), anEvent({ itemId: "fr-read-0002", correct: false })] }));

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
    expect(await repo.events()).toEqual([anEvent(), anEvent({ itemId: "fr-read-0002", correct: false })]);
  });

  it("stores the day it arrived and nothing finer, and nothing about who sent it", async () => {
    const { api, repo } = anApi();
    await api.record(post({ events: [anEvent()] }));

    const [row] = repo.rows();
    expect(row?.receivedOn).toBe("2026-09-25");
    expect(Object.keys(row ?? {}).sort()).toEqual(["bankVersion", "correct", "itemId", "receivedOn", "responseMs", "restBucket"]);
    expect(JSON.stringify(repo.rows())).not.toContain("203.0.113.7");
  });

  it("refuses an event that carries an identity, so it is never stored", async () => {
    const { api, repo } = anApi();

    const response = await api.record(post({ events: [anEvent({ deviceId: "d-1" })] }));

    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe("invalid-body");
    expect(await repo.events()).toEqual([]);
  });

  it("refuses a batch whose envelope carries anything beyond its events", async () => {
    const { api } = anApi();
    expect((await api.record(post({ events: [anEvent()], accountId: "a-1" }))).status).toBe(400);
  });

  it("refuses an empty batch, a body that is not JSON, and an out-of-range event", async () => {
    const { api } = anApi();
    expect((await api.record(post({ events: [] }))).status).toBe(400);
    expect((await api.record(post(null, { raw: "{not json" }))).status).toBe(400);
    expect((await api.record(post({ events: [anEvent({ restBucket: 5 })] }))).status).toBe(400);
  });

  it("refuses more events than the client's own batch cap as too many", async () => {
    const { api, repo } = anApi();
    const events = Array.from({ length: TELEMETRY_MAX_BATCH + 1 }, () => anEvent({ itemId: "x" }));

    const response = await api.record(post({ events }));

    expect(response.status).toBe(413);
    expect(await errorOf(response)).toBe("too-many-events");
    expect(await repo.events()).toEqual([]);
  });

  it("accepts a full batch at the cap", async () => {
    const { api } = anApi();
    const events = Array.from({ length: TELEMETRY_MAX_BATCH }, () => anEvent({ itemId: "x" }));
    expect((await api.record(post({ events }))).status).toBe(202);
  });

  it("refuses a body over its size limit before parsing it", async () => {
    const { api } = anApi();
    const response = await api.record(post(null, { raw: "x".repeat(MAX_TELEMETRY_BODY_BYTES + 1) }));

    expect(response.status).toBe(413);
    expect(await errorOf(response)).toBe("too-large");
  });

  it("rate-limits by the IP's hash, generously, and each address alone", async () => {
    const { api, repo } = anApi();
    for (let i = 0; i < TELEMETRY_RATE_LIMIT.max; i += 1) {
      expect((await api.record(post({ events: [anEvent()] }))).status).toBe(202);
    }

    const over = await api.record(post({ events: [anEvent()] }));
    expect(over.status).toBe(429);
    expect(await errorOf(over)).toBe("rate-limited");
    expect((await api.record(post({ events: [anEvent()] }, { ip: "198.51.100.4" }))).status).toBe(202);
    expect(await repo.events()).toHaveLength(TELEMETRY_RATE_LIMIT.max + 1);
  });

  it("keys the limit with the route's own name, apart from sync's", () => {
    const now = new Date("2026-09-25T18:45:12.345Z");
    expect(rateLimitKey("salt", "telemetry", "203.0.113.7", now)).not.toBe(rateLimitKey("salt", "register", "203.0.113.7", now));
  });
});
