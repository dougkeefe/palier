import { afterEach, describe, expect, it } from "vitest";

import { answersWithin, databaseAnswers, realtimeRateLimitStore, resetSyncApi, syncApi, telemetryApi } from "./db";

afterEach(() => {
  resetSyncApi();
});

describe("syncApi — the server's composition point", () => {
  it("is null when no database is configured, which every route answers with 503", async () => {
    expect(await syncApi({})).toBeNull();
    resetSyncApi();
    expect(await syncApi({ DATABASE_URL: "" })).toBeNull();
  });

  it("wires postgres.js over DATABASE_URL without connecting until a query runs", async () => {
    const api = await syncApi({ DATABASE_URL: "postgres://palier:palier@127.0.0.1:1/palier", RATE_LIMIT_SALT: "s" });

    expect(api).not.toBeNull();
    expect(Object.keys(api ?? {}).sort()).toEqual(
      ["deleteAccount", "listDevices", "pull", "push", "redeemPairCode", "registerDevice", "requestPairCode", "revokeDevice"],
    );
  });

  it("is built once per process, so a dev server re-evaluating modules shares one database", async () => {
    const first = syncApi({});

    expect(syncApi({ DATABASE_URL: "postgres://x@127.0.0.1:1/x" })).toBe(first);
  });
});

describe("telemetryApi — the telemetry half of the same composition point", () => {
  it("is null when no database is configured, which the route answers with 503", async () => {
    expect(await telemetryApi({})).toBeNull();
  });

  it("wires the telemetry handler over DATABASE_URL", async () => {
    const api = await telemetryApi({ DATABASE_URL: "postgres://palier:palier@127.0.0.1:1/palier", RATE_LIMIT_SALT: "s" });

    expect(Object.keys(api ?? {})).toEqual(["record"]);
  });

  it("shares one database with the sync API, so the hermetic lane never builds a second PGlite", async () => {
    const env = { DATABASE_URL: "postgres://palier:palier@127.0.0.1:1/palier" };
    const [sync, telemetry] = await Promise.all([syncApi(env), telemetryApi({})]);

    // The second call's environment is ignored: the database was already chosen.
    expect(sync).not.toBeNull();
    expect(telemetry).not.toBeNull();
  });
});

describe("realtimeRateLimitStore — the realtime route's limit (D195)", () => {
  const DATABASE_URL = "postgres://palier:palier@127.0.0.1:1/palier";

  it.each([
    ["no database is configured", {}],
    ["the database URL is empty", { DATABASE_URL: "" }],
    ["the lane is hermetic, even with a database", { PALIER_HERMETIC: "1", DATABASE_URL }],
  ])("is null when %s, so the route has no limit", (_, env) => {
    expect(realtimeRateLimitStore(env)).toBeNull();
  });

  it("keys with RATE_LIMIT_SALT and counts in the configured database, rejecting when it cannot be reached", async () => {
    const store = realtimeRateLimitStore({ DATABASE_URL, RATE_LIMIT_SALT: "s" });

    expect(store?.salt).toBe("s");
    await expect(store?.hit("key", "2026-10-03T12:00:00.000Z")).rejects.toThrow();
  });

  it("rejects a hit when the shared database was already chosen as none", async () => {
    expect(await syncApi({})).toBeNull();

    await expect(realtimeRateLimitStore({ DATABASE_URL })?.hit("key", "2026-10-03T12:00:00.000Z")).rejects.toThrow(
      "No database is configured.",
    );
  });
});

describe("databaseAnswers — the health route's database check (D140)", () => {
  it("is null when no database is configured", async () => {
    expect(await databaseAnswers({})).toBeNull();
  });

  it("is false when the configured database cannot be reached, and never throws", async () => {
    expect(await databaseAnswers({ DATABASE_URL: "postgres://palier:palier@127.0.0.1:1/palier" })).toBe(false);
  });
});

describe("answersWithin", () => {
  it("is true when the ping resolves in time", async () => {
    expect(await answersWithin(() => Promise.resolve(), 1_000)).toBe(true);
  });

  it("is false when the ping rejects", async () => {
    expect(await answersWithin(() => Promise.reject(new Error("down")), 1_000)).toBe(false);
  });

  it("is false when the ping is later than the limit", async () => {
    expect(await answersWithin(() => new Promise<void>(() => undefined), 10)).toBe(false);
  });
});
