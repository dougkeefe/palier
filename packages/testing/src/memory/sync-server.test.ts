import { PairCodeRejectedError } from "@palier/app";
import { describe, expect, it } from "vitest";

import { fakeClock } from "../clock/fake-clock.js";
import { memorySyncServer } from "./sync-server.js";

/**
 * What the contract cannot reach generically: time. The contract suite holds the
 * behaviour every implementation shares; these pin the clock-driven rules.
 */
describe("memorySyncServer", () => {
  it("expires a pairing code ten minutes after it was issued", async () => {
    const clock = fakeClock("2026-09-24T12:00:00.000Z");
    const server = memorySyncServer({ clock });
    const a = server.transport("a");
    await a.registerDevice("Laptop");

    const { code, expiresAt } = await a.requestPairCode();
    clock.advance(10 * 60 * 1000);

    expect(expiresAt).toBe("2026-09-24T12:10:00.000Z");
    await expect(server.transport("b").redeemPairCode(code, "Phone")).rejects.toThrow(PairCodeRejectedError);
  });

  it("accepts a code just inside its ten minutes", async () => {
    const clock = fakeClock("2026-09-24T12:00:00.000Z");
    const server = memorySyncServer({ clock });
    const a = server.transport("a");
    await a.registerDevice("Laptop");
    const { code } = await a.requestPairCode();
    clock.advance(10 * 60 * 1000 - 1);

    await expect(server.transport("b").redeemPairCode(code, "Phone")).resolves.toMatchObject({ accountId: expect.any(String) });
  });

  it("stamps a device's last-seen time on every authenticated call", async () => {
    const clock = fakeClock("2026-09-24T12:00:00.000Z");
    const server = memorySyncServer({ clock });
    const a = server.transport("a");
    await a.registerDevice("Laptop");
    clock.advance(60_000);
    await a.pull(0);

    expect((await a.listDevices())[0]?.lastSeenAt).toBe("2026-09-24T12:01:00.000Z");
  });

  it("drops an account left with no device when its last one pairs elsewhere, so its code dies with it", async () => {
    const server = memorySyncServer();
    const a = server.transport("a");
    const b = server.transport("b");
    await a.registerDevice("Laptop");
    const old = await b.registerDevice("Phone");
    const { code: toA } = await a.requestPairCode();
    const { code: toB } = await b.requestPairCode();

    await b.redeemPairCode(toA, "Phone");

    expect(server.documents(old.accountId)).toEqual([]);
    await expect(server.transport("c").redeemPairCode(toB, "Tablet")).rejects.toThrow(PairCodeRejectedError);
  });

  it("pages at the configured size", async () => {
    const server = memorySyncServer({ pageSize: 1 });
    const a = server.transport("a");
    await a.registerDevice("Laptop");
    await a.push([
      { type: "setting", id: "x", baseRevision: null, payload: 1 },
      { type: "setting", id: "y", baseRevision: null, payload: 2 },
    ]);

    expect(await a.pull(0)).toMatchObject({ docs: [{ id: "x" }], watermark: 1, more: true });
  });
});
