import { afterEach, describe, expect, it } from "vitest";

import { resetSyncApi, syncApi } from "./db";

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
