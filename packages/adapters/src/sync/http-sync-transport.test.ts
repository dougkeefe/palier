import { PairCodeRejectedError, SyncUnauthorizedError, SyncUnavailableError, deviceId } from "@palier/app";
import { memorySyncServer, mswServer, syncHandlers, syncTransportContract } from "@palier/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { type FetchLike, SyncProtocolError, httpSyncTransport } from "./http-sync-transport.js";

const BASE = "http://sync.test";

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  mswServer.resetHandlers();
});
afterAll(() => {
  mswServer.close();
});

// The whole contract over the real `fetch` path via MSW: the same suite the in-memory
// server passes, and that apps/web runs against the real route handlers (D69).
syncTransportContract("http over msw", () => {
  mswServer.use(...syncHandlers(memorySyncServer(), { baseUrl: BASE }));
  return Promise.resolve((secret) =>
    httpSyncTransport({ baseUrl: BASE, credentials: () => Promise.resolve(secret), retryDelayMs: 0 }),
  );
});

type Reply = { status: number; body?: unknown; throws?: boolean; badJson?: boolean };

/** A scripted `fetch`: each call takes the next reply, and every request is recorded. */
const scripted = (...replies: Reply[]) => {
  const calls: { url: string; init: Parameters<FetchLike>[1] }[] = [];
  const fetchImpl: FetchLike = (url, init) => {
    calls.push({ url, init });
    const reply = replies.shift() ?? { status: 500 };
    if (reply.throws === true) return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve({
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: () => (reply.badJson === true ? Promise.reject(new SyntaxError("<html>")) : Promise.resolve(reply.body)),
    });
  };
  const sleep = vi.fn(() => Promise.resolve());
  const transport = httpSyncTransport({ baseUrl: BASE, credentials: () => Promise.resolve("s3cret"), fetchImpl, sleep });
  return { transport, calls, sleep };
};

const identity = { accountId: "acc", deviceId: "dev" };

describe("httpSyncTransport — requests", () => {
  it("presents the device secret as a bearer, and sends a JSON body only when there is one", async () => {
    const { transport, calls } = scripted({ status: 200, body: identity }, { status: 200, body: { devices: [] } });

    await transport.registerDevice("Laptop");
    await transport.listDevices();

    expect(calls[0]?.init).toEqual({
      method: "POST",
      headers: { authorization: "Bearer s3cret", "content-type": "application/json" },
      body: JSON.stringify({ label: "Laptop" }),
    });
    expect(calls[1]?.init).toEqual({ method: "GET", headers: { authorization: "Bearer s3cret" } });
  });

  it("names the watermark in the pull URL and escapes a device id in the revoke URL", async () => {
    const { transport, calls } = scripted({ status: 200, body: { docs: [], watermark: 4, more: false } }, { status: 204 });

    await transport.pull(4);
    await transport.revokeDevice(deviceId("a/b"));

    expect(calls.map((c) => c.url)).toEqual([`${BASE}/api/sync?watermark=4`, `${BASE}/api/account/device/a%2Fb`]);
  });
});

describe("httpSyncTransport — error translation", () => {
  it("turns an unreachable network into SyncUnavailableError after one retry", async () => {
    const { transport, calls, sleep } = scripted({ status: 0, throws: true }, { status: 0, throws: true });

    await expect(transport.pull(0)).rejects.toThrow(SyncUnavailableError);
    expect(calls).toHaveLength(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 once and succeeds if the service comes back", async () => {
    const { transport, calls } = scripted({ status: 503 }, { status: 200, body: { docs: [], watermark: 0, more: false } });

    expect(await transport.pull(0)).toEqual({ docs: [], watermark: 0, more: false });
    expect(calls).toHaveLength(2);
  });

  it("does not retry a 500, and reports it as unavailable", async () => {
    const { transport, calls } = scripted({ status: 500 });

    await expect(transport.pull(0)).rejects.toThrow(SyncUnavailableError);
    expect(calls).toHaveLength(1);
  });

  it("reports a rate limit as unavailable, not as an error to show", async () => {
    const { transport } = scripted({ status: 429 });

    await expect(transport.registerDevice("x")).rejects.toThrow(/slow down/);
  });

  it("turns 401 into SyncUnauthorizedError", async () => {
    const { transport } = scripted({ status: 401 });

    await expect(transport.listDevices()).rejects.toThrow(SyncUnauthorizedError);
  });

  it("turns a 404 on redeeming into PairCodeRejectedError, and never retries a redeem", async () => {
    const rejected = scripted({ status: 404 });
    const flaky = scripted({ status: 503 }, { status: 200, body: identity });

    await expect(rejected.transport.redeemPairCode("AAAAAA", "Phone")).rejects.toThrow(PairCodeRejectedError);
    await expect(flaky.transport.redeemPairCode("AAAAAA", "Phone")).rejects.toThrow(SyncUnavailableError);
    expect(flaky.calls).toHaveLength(1);
  });

  it("treats a 404 on revoke as the no-op the port promises", async () => {
    const { transport } = scripted({ status: 404 });

    await expect(transport.revokeDevice(deviceId("other"))).resolves.toBeUndefined();
  });

  it("throws a protocol error for a request the server refused as malformed", async () => {
    const { transport } = scripted({ status: 413 });

    await expect(transport.push([])).rejects.toThrow(SyncProtocolError);
  });

  it("treats a 404 anywhere else as a protocol error", async () => {
    const { transport } = scripted({ status: 404 });

    await expect(transport.deleteAccount()).rejects.toThrow(SyncProtocolError);
  });
});

describe("httpSyncTransport — responses are structure-checked", () => {
  const unavailable = /malformed response/;

  it("reports a body that is not JSON — a captive portal's page — as unavailable", async () => {
    const { transport } = scripted({ status: 200, badJson: true });

    await expect(transport.pull(0)).rejects.toThrow(unavailable);
  });

  it("rejects a malformed identity, pull, push, device list or pairing code", async () => {
    const cases: [Reply, (t: ReturnType<typeof scripted>["transport"]) => Promise<unknown>][] = [
      [{ status: 200, body: { accountId: 1 } }, (t) => t.registerDevice("x")],
      [{ status: 200, body: { docs: [{ type: "apiKey", id: "k", revision: 1, payload: 1 }], watermark: 1, more: false } }, (t) => t.pull(0)],
      [{ status: 200, body: { docs: "nope", watermark: 1, more: false } }, (t) => t.pull(0)],
      [{ status: 200, body: { docs: [], watermark: -1, more: false } }, (t) => t.pull(0)],
      [{ status: 200, body: { accepted: [{ type: "setting", id: "k" }], conflicts: [] } }, (t) => t.push([])],
      [{ status: 200, body: "text" }, (t) => t.push([])],
      [{ status: 200, body: { devices: [{ id: "d", label: "L" }] } }, (t) => t.listDevices()],
      [{ status: 200, body: [] }, (t) => t.listDevices()],
      [{ status: 200, body: { code: "AAAAAA" } }, (t) => t.requestPairCode()],
    ];
    for (const [reply, call] of cases) {
      await expect(call(scripted(reply).transport)).rejects.toThrow(unavailable);
    }
  });

  it("returns a well-formed device list and push result as the port's types", async () => {
    const { transport } = scripted(
      { status: 200, body: { devices: [{ id: "d", label: "L", lastSeenAt: "2026-09-24T12:00:00.000Z", current: true }] } },
      { status: 200, body: { accepted: [{ type: "setting", id: "k", revision: 3 }], conflicts: [] } },
    );

    expect(await transport.listDevices()).toEqual([{ id: "d", label: "L", lastSeenAt: "2026-09-24T12:00:00.000Z", current: true }]);
    expect(await transport.push([])).toEqual({ accepted: [{ type: "setting", id: "k", revision: 3 }], conflicts: [] });
  });

  it("waits with the platform timer by default before its one retry", async () => {
    vi.useFakeTimers();
    try {
      let n = 0;
      const fetchImpl: FetchLike = () =>
        Promise.resolve(
          n++ === 0
            ? { ok: false, status: 503, json: () => Promise.resolve(null) }
            : { ok: true, status: 200, json: () => Promise.resolve({ docs: [], watermark: 0, more: false }) },
        );
      const transport = httpSyncTransport({ baseUrl: BASE, credentials: () => Promise.resolve("s"), fetchImpl });

      const pending = transport.pull(0);
      await vi.advanceTimersByTimeAsync(500);

      expect(await pending).toEqual({ docs: [], watermark: 0, more: false });
    } finally {
      vi.useRealTimers();
    }
  });
});
