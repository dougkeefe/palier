import { describe, expect, it, vi } from "vitest";

import { memorySyncRepository } from "./__tests__/memory-repository";
import { syncRepositoryContract } from "./__tests__/repository.contract";
import { MAX_PUSH_ITEMS, RATE_LIMITS, type SyncApi, createSyncApi, healthResponse } from "./handlers";
import type { SyncRepository } from "./repository";
import { pairCodeFrom, rateLimitKey, sha256 } from "./secrets";

syncRepositoryContract("memory", () => Promise.resolve(memorySyncRepository()));

const BASE = "http://palier.test";
const secret = (n: number) => n.toString(16).padStart(64, "0");

type Call = { method?: string; path: string; bearer?: string | null; body?: unknown; raw?: string; ip?: string };

const request = ({ method = "GET", path, bearer = secret(1), body, raw, ip = "203.0.113.7" }: Call): Request =>
  new Request(`${BASE}${path}`, {
    method,
    headers: {
      ...(bearer === null ? {} : { authorization: `Bearer ${bearer}` }),
      "x-forwarded-for": `${ip}, 10.0.0.1`,
    },
    ...(raw !== undefined ? { body: raw } : body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const anApi = (over: { repo?: SyncRepository; now?: () => Date; randomBytes?: (n: number) => Uint8Array } = {}) => {
  let clock = new Date("2026-09-24T12:00:00.000Z");
  const repo = over.repo ?? memorySyncRepository();
  const api = createSyncApi({
    repo,
    now: over.now ?? (() => clock),
    randomBytes: over.randomBytes ?? ((n) => Uint8Array.from({ length: n }, (_, i) => i * 5)),
    rateLimitSalt: "salt",
  });
  return {
    api,
    repo,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
  };
};

const register = (api: SyncApi, n = 1, ip?: string) =>
  api.registerDevice(request({ method: "POST", path: "/api/account/device", bearer: secret(n), body: { label: "Laptop" }, ...(ip === undefined ? {} : { ip }) }));

const bodyOf = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("healthResponse (GET /api/health, D140)", () => {
  const health = { build: "d9fbed6", bank: 3 } as const;

  it("reports the build, the bank and a database that answers, uncached", async () => {
    const response = healthResponse({ ...health, database: true });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ build: "d9fbed6", bank: 3, database: "ok" });
  });

  it("is healthy with no database configured, since the app works without one (ADR 21)", async () => {
    const response = healthResponse({ ...health, database: null });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ build: "d9fbed6", bank: 3, database: "not-configured" });
  });

  it("answers 503 when a configured database does not answer", async () => {
    const response = healthResponse({ ...health, database: false });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ build: "d9fbed6", bank: 3, database: "unreachable" });
  });
});

describe("registerDevice", () => {
  it("creates an account for a new secret and returns its ids", async () => {
    const { api } = anApi();

    const res = await register(api);

    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ accountId: expect.any(String), deviceId: expect.any(String) });
  });

  it("returns the same identity to the same live secret, so a retry makes no second account", async () => {
    const { api } = anApi();
    const first = await bodyOf(await register(api));

    expect(await bodyOf(await register(api))).toEqual(first);
  });

  it("stores only the SHA-256 of the secret, never the secret (D70)", async () => {
    const { api, repo } = anApi();
    await register(api);

    expect(await repo.deviceBySecretHash(sha256(secret(1)))).not.toBeNull();
    expect(await repo.deviceBySecretHash(secret(1))).toBeNull();
  });

  it("refuses a missing or malformed bearer with 401", async () => {
    const { api } = anApi();

    expect((await api.registerDevice(request({ method: "POST", path: "/", bearer: null, body: { label: "x" } }))).status).toBe(401);
    expect((await api.registerDevice(request({ method: "POST", path: "/", bearer: "short", body: { label: "x" } }))).status).toBe(401);
  });

  it("refuses a body that is not JSON, or has no usable label, with 400", async () => {
    const { api } = anApi();
    const call = (init: Partial<Call>) => api.registerDevice(request({ method: "POST", path: "/", ...init }));

    expect((await call({ raw: "{not json" })).status).toBe(400);
    expect((await call({ body: { label: "   " } })).status).toBe(400);
    expect((await call({ body: { label: "x".repeat(81) } })).status).toBe(400);
  });

  it("refuses a body over a megabyte with 413 before parsing it", async () => {
    const { api } = anApi();

    const res = await api.registerDevice(request({ method: "POST", path: "/", raw: " ".repeat(1_000_001) }));

    expect(res.status).toBe(413);
  });

  it(`rate-limits new registrations per IP hash: ${String(RATE_LIMITS.register.max)} an hour`, async () => {
    const { api, advance } = anApi();
    for (let i = 1; i <= RATE_LIMITS.register.max; i++) expect((await register(api, i)).status).toBe(200);

    expect((await register(api, 999)).status).toBe(429);
    expect((await register(api, 998, "198.51.100.1")).status).toBe(200);
    advance(RATE_LIMITS.register.windowMs);
    expect((await register(api, 997)).status).toBe(200);
  });

  it("does not count a returning device against the limit", async () => {
    const { api } = anApi();
    await register(api);
    for (let i = 0; i < RATE_LIMITS.register.max + 1; i++) expect((await register(api)).status).toBe(200);
  });

  it("registers a removed device's secret as a fresh account", async () => {
    const { api } = anApi();
    const first = await bodyOf<{ accountId: string; deviceId: string }>(await register(api));
    await api.revokeDevice(request({ method: "DELETE", path: "/" }), first.deviceId);

    const again = await bodyOf<{ accountId: string }>(await register(api));

    expect(again.accountId).not.toBe(first.accountId);
  });
});

describe("authentication on every other route", () => {
  it("answers 401 to a secret that never registered, or whose device was removed", async () => {
    const { api } = anApi();
    const stranger = { bearer: secret(42) };
    const calls = [
      api.requestPairCode(request({ method: "POST", path: "/", ...stranger })),
      api.listDevices(request({ path: "/", ...stranger })),
      api.revokeDevice(request({ method: "DELETE", path: "/", ...stranger }), "x"),
      api.deleteAccount(request({ method: "DELETE", path: "/", ...stranger })),
      api.pull(request({ path: "/api/sync", ...stranger })),
      api.push(request({ method: "POST", path: "/", body: { items: [] }, ...stranger })),
    ];

    expect((await Promise.all(calls)).map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });
});

describe("pairing", () => {
  const paired = async () => {
    const env = anApi();
    const a = await bodyOf<{ accountId: string; deviceId: string }>(await register(env.api, 1));
    const { code } = await bodyOf<{ code: string }>(
      await env.api.requestPairCode(request({ method: "POST", path: "/", bearer: secret(1) })),
    );
    return { ...env, a, code };
  };
  const redeem = (api: SyncApi, code: string, n = 2) =>
    api.redeemPairCode(request({ method: "POST", path: "/", bearer: secret(n), body: { code, label: "Phone" } }));

  it("issues a code that expires in ten minutes and joins a second device to the account", async () => {
    const { api, a, code } = await paired();

    const joined = await redeem(api, code.toLowerCase());

    expect(joined.status).toBe(200);
    expect(await bodyOf(joined)).toMatchObject({ accountId: a.accountId });
  });

  it("stores the code only as a hash", async () => {
    const { repo, code, a } = await paired();

    expect(await repo.redeemPairCode({ hash: sha256(code), at: "2026-09-24T12:00:00.000Z" })).toBe(a.accountId);
  });

  it("refuses a code that expired, was used, never existed or cannot be a code, all with 404", async () => {
    const { api, code, advance } = await paired();
    expect((await redeem(api, code)).status).toBe(200);

    expect((await redeem(api, code, 3)).status).toBe(404);
    expect((await redeem(api, "ZZZZZZ", 3)).status).toBe(404);
    expect((await redeem(api, "0O1IL0", 3)).status).toBe(404);
    const { code: late } = await bodyOf<{ code: string }>(
      await api.requestPairCode(request({ method: "POST", path: "/", bearer: secret(1) })),
    );
    advance(10 * 60 * 1000);
    expect((await redeem(api, late, 4)).status).toBe(404);
  });

  it("refuses to redeem without a bearer, or with a malformed body", async () => {
    const { api, code } = await paired();

    expect((await api.redeemPairCode(request({ method: "POST", path: "/", bearer: null, body: { code } }))).status).toBe(401);
    expect((await api.redeemPairCode(request({ method: "POST", path: "/", bearer: secret(2), body: { code } }))).status).toBe(400);
  });

  it(`rate-limits redeeming per IP hash: ${String(RATE_LIMITS.pair.max)} tries in ten minutes`, async () => {
    const { api } = await paired();
    for (let i = 0; i < RATE_LIMITS.pair.max; i++) expect((await redeem(api, "ZZZZZZ", 3)).status).toBe(404);

    expect((await redeem(api, "ZZZZZZ", 3)).status).toBe(429);
  });

  it("rate-limits issuing codes too", async () => {
    const { api } = await paired();
    for (let i = 1; i < RATE_LIMITS.pairCode.max; i++) {
      expect((await api.requestPairCode(request({ method: "POST", path: "/" }))).status).toBe(200);
    }

    expect((await api.requestPairCode(request({ method: "POST", path: "/" }))).status).toBe(429);
  });
});

describe("devices", () => {
  it("lists the account's devices, marking the caller, and revokes one with 204", async () => {
    const { api } = anApi();
    await register(api, 1);
    const { code } = await bodyOf<{ code: string }>(await api.requestPairCode(request({ method: "POST", path: "/" })));
    const phone = await bodyOf<{ deviceId: string }>(
      await api.redeemPairCode(request({ method: "POST", path: "/", bearer: secret(2), body: { code, label: "Phone" } })),
    );

    const { devices } = await bodyOf<{ devices: { label: string; current: boolean }[] }>(
      await api.listDevices(request({ path: "/" })),
    );
    const revoke = await api.revokeDevice(request({ method: "DELETE", path: "/" }), phone.deviceId);

    expect(devices.map((d) => [d.label, d.current])).toEqual([
      ["Laptop", true],
      ["Phone", false],
    ]);
    expect(revoke.status).toBe(204);
    expect((await api.pull(request({ path: "/api/sync", bearer: secret(2) }))).status).toBe(401);
  });

  it("answers 404, not 403, for a device the caller's account does not hold (tier 11)", async () => {
    const { api } = anApi();
    await register(api, 1);
    const other = await bodyOf<{ deviceId: string }>(await register(api, 2));

    expect((await api.revokeDevice(request({ method: "DELETE", path: "/" }), other.deviceId)).status).toBe(404);
    expect((await api.revokeDevice(request({ method: "DELETE", path: "/" }), "not-a-device-id")).status).toBe(404);
    expect((await api.pull(request({ path: "/api/sync", bearer: secret(2) }))).status).toBe(200);
  });

  it("deletes the account, after which its secret is no longer recognised", async () => {
    const { api } = anApi();
    await register(api);

    const res = await api.deleteAccount(request({ method: "DELETE", path: "/" }));

    expect(await bodyOf(res)).toEqual({ deleted: true });
    expect((await api.listDevices(request({ path: "/" }))).status).toBe(401);
  });
});

describe("pull and push", () => {
  const item = (id: string, baseRevision: number | null = null) => ({ type: "setting", id, baseRevision, payload: { v: id } });
  const push = (api: SyncApi, items: unknown[]) => api.push(request({ method: "POST", path: "/api/sync", body: { items } }));
  const pull = (api: SyncApi, query = "") => api.pull(request({ path: `/api/sync${query}` }));

  it("pushes, then pulls from zero when no watermark is given", async () => {
    const { api } = anApi();
    await register(api);

    const pushed = await bodyOf(await push(api, [item("a"), item("b")]));
    const pulled = await bodyOf(await pull(api));

    expect(pushed).toEqual({
      accepted: [
        { type: "setting", id: "a", revision: 1 },
        { type: "setting", id: "b", revision: 2 },
      ],
      conflicts: [],
    });
    expect(pulled).toMatchObject({ watermark: 2, more: false });
  });

  it("returns the watermark it was given when there is nothing newer", async () => {
    const { api } = anApi();
    await register(api);

    expect(await bodyOf(await pull(api, "?watermark=7"))).toEqual({ docs: [], watermark: 7, more: false });
  });

  it("refuses a watermark that is not a non-negative integer", async () => {
    const { api } = anApi();
    await register(api);

    expect((await pull(api, "?watermark=-1")).status).toBe(400);
    expect((await pull(api, "?watermark=soon")).status).toBe(400);
  });

  it("refuses a push item of an unknown type, a non-object payload, or a bad base", async () => {
    const { api } = anApi();
    await register(api);

    for (const bad of [
      { ...item("a"), type: "apiKey" },
      { ...item("a"), payload: "text" },
      { ...item("a"), baseRevision: -1 },
      { ...item("a"), id: "" },
    ]) {
      expect((await push(api, [bad])).status).toBe(400);
    }
  });

  it(`refuses more than ${String(MAX_PUSH_ITEMS)} items in one push with 413`, async () => {
    const { api } = anApi();
    await register(api);

    const res = await push(api, Array.from({ length: MAX_PUSH_ITEMS + 1 }, (_, i) => item(`k${String(i)}`)));

    expect(res.status).toBe(413);
  });

  it("lets a failure that is not a refusal through, so the platform answers 500", async () => {
    const repo = memorySyncRepository();
    const { api } = anApi({ repo });
    await register(api);
    vi.spyOn(repo, "pull").mockRejectedValue(new Error("database down"));

    await expect(pull(api)).rejects.toThrow("database down");
  });
});

describe("secrets", () => {
  it("draws every pairing code character from the alphabet, rejecting biased bytes", () => {
    const bytes = [255, 250, 0, 30, 31, 62, 100, 200, 5];
    let i = 0;
    const code = pairCodeFrom((n) => Uint8Array.from({ length: n }, () => bytes[i++ % bytes.length] ?? 0));

    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });

  it("keys the rate limit by an HMAC that changes daily and never contains the IP", () => {
    const today = rateLimitKey("salt", "pair", "203.0.113.7", new Date("2026-09-24T12:00:00.000Z"));
    const tomorrow = rateLimitKey("salt", "pair", "203.0.113.7", new Date("2026-09-25T12:00:00.000Z"));

    expect(today).toMatch(/^[0-9a-f]{64}$/);
    expect(today).not.toContain("203");
    expect(tomorrow).not.toBe(today);
  });

  it("falls back to one shared bucket when no forwarded address is present", async () => {
    const { api } = anApi();
    const res = await api.registerDevice(
      new Request(`${BASE}/`, { method: "POST", headers: { authorization: `Bearer ${secret(1)}` }, body: JSON.stringify({ label: "x" }) }),
    );

    expect(res.status).toBe(200);
  });
});
