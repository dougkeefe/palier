import { beforeEach, describe, expect, it, vi } from "vitest";

import { memorySyncRepository } from "../../server/__tests__/memory-repository";
import { type SyncApi, createSyncApi } from "../../server/handlers";

/**
 * Every route under `src/app/api/` is bound to its handler, and answers 503 when no sync
 * database is configured. The handlers themselves are tested in `server/handlers.test.ts`;
 * this holds the binding, which is all a route file is.
 */

const state = vi.hoisted(() => ({ api: null as SyncApi | null }));
vi.mock("../../server/db", () => ({ syncApi: () => Promise.resolve(state.api) }));

const { POST: register } = await import("./account/device/route");
const { DELETE: revoke } = await import("./account/device/[id]/route");
const { POST: pairCode } = await import("./account/pair-code/route");
const { POST: pair } = await import("./account/pair/route");
const { GET: devices } = await import("./account/devices/route");
const { DELETE: deleteAccount } = await import("./account/route");
const { GET: pull, POST: push } = await import("./sync/route");

const secret = (n: number) => n.toString(16).padStart(64, "0");
const req = (method: string, path: string, body?: unknown, n = 1) =>
  new Request(`http://palier.test${path}`, {
    method,
    headers: { authorization: `Bearer ${secret(n)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  state.api = createSyncApi({
    repo: memorySyncRepository(),
    now: () => new Date("2026-09-24T12:00:00.000Z"),
    randomBytes: (n) => Uint8Array.from({ length: n }, (_, i) => i * 7),
    rateLimitSalt: "salt",
  });
});

describe("the sync routes", () => {
  it("bind registration, pairing, devices, sync and account deletion to their handlers", async () => {
    expect((await register(req("POST", "/api/account/device", { label: "Laptop" }))).status).toBe(200);
    const { code } = (await (await pairCode(req("POST", "/api/account/pair-code"))).json()) as { code: string };
    const joined = (await (await pair(req("POST", "/api/account/pair", { code, label: "Phone" }, 2))).json()) as {
      deviceId: string;
    };
    const listed = (await (await devices(req("GET", "/api/account/devices"))).json()) as { devices: unknown[] };
    const pushed = await push(req("POST", "/api/sync", { items: [{ type: "setting", id: "k", baseRevision: null, payload: { v: 1 } }] }));
    const pulled = (await (await pull(req("GET", "/api/sync?watermark=0"))).json()) as { docs: unknown[] };

    expect(listed.devices).toHaveLength(2);
    expect(pushed.status).toBe(200);
    expect(pulled.docs).toHaveLength(1);
    expect((await revoke(req("DELETE", `/api/account/device/${joined.deviceId}`), params(joined.deviceId))).status).toBe(204);
    expect((await deleteAccount(req("DELETE", "/api/account"))).status).toBe(200);
  });

  it("answer 503 on every route when no sync database is configured", async () => {
    state.api = null;

    const responses = await Promise.all([
      register(req("POST", "/", { label: "x" })),
      revoke(req("DELETE", "/"), params("x")),
      pairCode(req("POST", "/")),
      pair(req("POST", "/", { code: "AAAAAA", label: "x" })),
      devices(req("GET", "/")),
      deleteAccount(req("DELETE", "/")),
      pull(req("GET", "/")),
      push(req("POST", "/", { items: [] })),
    ]);

    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(503));
    expect(await responses[0]?.json()).toEqual({ error: "sync-unavailable" });
  });
});
