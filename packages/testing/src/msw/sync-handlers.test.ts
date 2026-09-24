import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { memorySyncServer } from "../memory/sync-server.js";
import { mswServer } from "./node.js";
import { syncHandlers } from "./sync-handlers.js";

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

const as = (secret: string | null, init: RequestInit & { json?: unknown } = {}): RequestInit => ({
  ...init,
  headers: {
    ...(secret === null ? {} : { authorization: `Bearer ${secret}` }),
    ...(init.json === undefined ? {} : { "content-type": "application/json" }),
  },
  ...(init.json === undefined ? {} : { body: JSON.stringify(init.json) }),
});

const serve = () => {
  const server = memorySyncServer();
  mswServer.use(...syncHandlers(server, { baseUrl: BASE }));
  return server;
};

describe("syncHandlers — the wire protocol over a memory server", () => {
  it("registers, pushes and pulls over HTTP", async () => {
    serve();
    const reg = await fetch(`${BASE}/api/account/device`, as("s1", { method: "POST", json: { label: "Laptop" } }));
    const push = await fetch(
      `${BASE}/api/sync`,
      as("s1", { method: "POST", json: { items: [{ type: "setting", id: "k", baseRevision: null, payload: 1 }] } }),
    );
    const pull = await fetch(`${BASE}/api/sync?watermark=0`, as("s1"));

    expect(reg.status).toBe(200);
    expect(await reg.json()).toMatchObject({ accountId: expect.any(String) });
    expect(await push.json()).toMatchObject({ accepted: [{ id: "k", revision: 1 }], conflicts: [] });
    expect(await pull.json()).toMatchObject({ docs: [{ id: "k", payload: 1 }], watermark: 1, more: false });
  });

  it("pulls from zero when the watermark is left off", async () => {
    serve();
    await fetch(`${BASE}/api/account/device`, as("s1", { method: "POST", json: { label: "Laptop" } }));

    expect(await (await fetch(`${BASE}/api/sync`, as("s1"))).json()).toEqual({ docs: [], watermark: 0, more: false });
  });

  it("answers 401 without a bearer, and for a secret that never registered", async () => {
    serve();

    expect((await fetch(`${BASE}/api/sync`, as(null))).status).toBe(401);
    expect((await fetch(`${BASE}/api/account/devices`, as("nobody"))).status).toBe(401);
  });

  it("pairs by code, lists devices, revokes with 204 and deletes the account", async () => {
    serve();
    await fetch(`${BASE}/api/account/device`, as("a", { method: "POST", json: { label: "Laptop" } }));
    const { code } = (await (await fetch(`${BASE}/api/account/pair-code`, as("a", { method: "POST" }))).json()) as {
      code: string;
    };
    const joined = (await (
      await fetch(`${BASE}/api/account/pair`, as("b", { method: "POST", json: { code, label: "Phone" } }))
    ).json()) as { deviceId: string };
    const { devices } = (await (await fetch(`${BASE}/api/account/devices`, as("a"))).json()) as { devices: unknown[] };

    const revoke = await fetch(`${BASE}/api/account/device/${joined.deviceId}`, as("a", { method: "DELETE" }));
    const del = await fetch(`${BASE}/api/account`, as("a", { method: "DELETE" }));

    expect(devices).toHaveLength(2);
    expect(revoke.status).toBe(204);
    expect(await del.json()).toEqual({ deleted: true });
  });

  it("answers 404 for a pairing code it never issued", async () => {
    serve();

    const res = await fetch(`${BASE}/api/account/pair`, as("b", { method: "POST", json: { code: "ZZZZZZ", label: "Phone" } }));

    expect(res.status).toBe(404);
  });
});
