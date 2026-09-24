import { describe, expect, it } from "vitest";

import type { PushItem, SyncTransport } from "@palier/app";
import {
  PAIR_CODE_ALPHABET,
  PAIR_CODE_LENGTH,
  PairCodeRejectedError,
  SyncUnauthorizedError,
  deviceId,
} from "@palier/app";

/**
 * A device secret the way the vault mints one: 64 hex characters (256 bits, D50).
 * Distinct per `n`, so each call is a different device.
 */
export const contractSecret = (n: number): string => n.toString(16).padStart(64, "0");

const item = (id: string, baseRevision: number | null = null, payload: unknown = { n: id }): PushItem => ({
  type: "setting",
  id,
  baseRevision,
  payload,
});

/**
 * The `SyncTransport` contract (implementation-plan.md §6.2 tier 3). `make` returns a
 * fresh service and a way to reach it *as* a given device secret, so the suite can
 * stand up several devices on one service. Run against the in-memory server, the HTTP
 * adapter over MSW, and the HTTP adapter over the real route handlers — which is what
 * makes all three substitutable (progress.md D69).
 */
export const syncTransportContract = (
  name: string,
  make: () => Promise<(secret: string) => SyncTransport>,
): void => {
  describe(`SyncTransport contract: ${name}`, () => {
    const registered = async (n = 1) => {
      const connect = await make();
      const device = connect(contractSecret(n));
      const identity = await device.registerDevice("Laptop");
      return { connect, device, identity };
    };

    const paired = async () => {
      const { connect, device: a, identity } = await registered(1);
      const { code } = await a.requestPairCode();
      const b = connect(contractSecret(2));
      const joined = await b.redeemPairCode(code, "Phone");
      return { connect, a, b, identity, joined };
    };

    describe("identity", () => {
      it("registers a device and returns its account and device ids", async () => {
        const { identity } = await registered();

        expect(identity.accountId).not.toBe("");
        expect(identity.deviceId).not.toBe("");
      });

      it("returns the same identity when the same secret registers again, so a retry makes no second account", async () => {
        const { device, identity } = await registered();

        expect(await device.registerDevice("Laptop")).toEqual(identity);
      });

      it("refuses every call from a secret that never registered", async () => {
        const connect = await make();
        const stranger = connect(contractSecret(99));

        await expect(stranger.pull(0)).rejects.toThrow(SyncUnauthorizedError);
        await expect(stranger.push([item("x")])).rejects.toThrow(SyncUnauthorizedError);
        await expect(stranger.listDevices()).rejects.toThrow(SyncUnauthorizedError);
        await expect(stranger.requestPairCode()).rejects.toThrow(SyncUnauthorizedError);
      });
    });

    describe("push and pull", () => {
      it("accepts new documents with strictly increasing revisions and pulls them back in order", async () => {
        const { device } = await registered();

        const pushed = await device.push([item("a"), item("b")]);
        const pulled = await device.pull(0);

        expect(pushed.conflicts).toEqual([]);
        const [first, second] = pushed.accepted;
        expect(first?.revision).toBeLessThan(second?.revision ?? 0);
        expect(pulled.docs.map((d) => [d.id, d.revision, d.payload])).toEqual([
          ["a", first?.revision, { n: "a" }],
          ["b", second?.revision, { n: "b" }],
        ]);
        expect(pulled.watermark).toBe(second?.revision);
        expect(pulled.more).toBe(false);
      });

      it("pulls only what is newer than the watermark, and returns the watermark unchanged when nothing is", async () => {
        const { device } = await registered();
        const first = await device.push([item("a")]);
        const mark = first.accepted[0]?.revision ?? 0;
        await device.push([item("b")]);

        expect((await device.pull(mark)).docs.map((d) => d.id)).toEqual(["b"]);
        const end = (await device.pull(0)).watermark;
        expect(await device.pull(end)).toEqual({ docs: [], watermark: end, more: false });
      });

      it("takes a write whose base is the current revision, and stamps a newer one", async () => {
        const { device } = await registered();
        const base = (await device.push([item("a")])).accepted[0]?.revision ?? 0;

        const result = await device.push([item("a", base, { n: "a2" })]);

        expect(result.conflicts).toEqual([]);
        expect(result.accepted[0]?.revision).toBeGreaterThan(base);
        expect((await device.pull(base)).docs[0]?.payload).toEqual({ n: "a2" });
      });

      it("refuses a stale base and a missing one, answering with the server's current copy", async () => {
        const { device } = await registered();
        const base = (await device.push([item("a")])).accepted[0]?.revision ?? 0;
        const current = (await device.push([item("a", base, { n: "a2" })])).accepted[0]?.revision;

        const stale = await device.push([item("a", base, { n: "stale" })]);
        const blind = await device.push([item("a", null, { n: "blind" })]);

        for (const result of [stale, blind]) {
          expect(result.accepted).toEqual([]);
          expect(result.conflicts).toEqual([{ type: "setting", id: "a", revision: current, payload: { n: "a2" } }]);
        }
      });

      it("keeps documents of different types with the same id apart", async () => {
        const { device } = await registered();
        await device.push([item("same"), { type: "attempt", id: "same", baseRevision: null, payload: { k: 1 } }]);

        expect((await device.pull(0)).docs.map((d) => d.type).sort()).toEqual(["attempt", "setting"]);
      });

      it("pages a large pull at 500 documents and says there is more", async () => {
        const { device } = await registered();
        const many = Array.from({ length: 500 }, (_, i) => item(`k${String(i)}`));
        await device.push(many);
        await device.push([item("last")]);

        const first = await device.pull(0);
        const rest = await device.pull(first.watermark);

        expect(first.docs).toHaveLength(500);
        expect(first.more).toBe(true);
        expect(rest.docs.map((d) => d.id)).toEqual(["last"]);
        expect(rest.more).toBe(false);
      });
    });

    describe("pairing", () => {
      it("issues a six-character code from the unambiguous alphabet, expiring in the future", async () => {
        const { device } = await registered();

        const { code, expiresAt } = await device.requestPairCode();

        expect(code).toHaveLength(PAIR_CODE_LENGTH);
        expect([...code].every((c) => PAIR_CODE_ALPHABET.includes(c))).toBe(true);
        expect(Number.isNaN(Date.parse(expiresAt))).toBe(false);
      });

      it("joins a second device to the account, which then sees the same documents", async () => {
        const { a, b, identity, joined } = await paired();
        await a.push([item("from-a")]);

        expect(joined.accountId).toBe(identity.accountId);
        expect(joined.deviceId).not.toBe(identity.deviceId);
        expect((await b.pull(0)).docs.map((d) => d.id)).toEqual(["from-a"]);
      });

      it("accepts a code once", async () => {
        const { connect, device } = await registered();
        const { code } = await device.requestPairCode();
        await connect(contractSecret(2)).redeemPairCode(code, "Phone");

        await expect(connect(contractSecret(3)).redeemPairCode(code, "Tablet")).rejects.toThrow(PairCodeRejectedError);
      });

      it("rejects a code it never issued", async () => {
        const { connect } = await registered();

        await expect(connect(contractSecret(2)).redeemPairCode("ZZZZZZ", "Phone")).rejects.toThrow(PairCodeRejectedError);
      });

      it("moves a device that already had its own account into the code's account", async () => {
        const { connect, device: a, identity } = await registered(1);
        const b = connect(contractSecret(2));
        await b.registerDevice("Phone");
        await b.push([item("own")]);
        const { code } = await a.requestPairCode();

        const joined = await b.redeemPairCode(code, "Phone");

        expect(joined.accountId).toBe(identity.accountId);
        expect((await b.pull(0)).docs.map((d) => d.id)).toEqual([]);
      });
    });

    describe("devices", () => {
      it("lists the account's devices with their labels, marking the caller", async () => {
        const { a, b } = await paired();

        const fromA = [...(await a.listDevices())].sort((x, y) => x.label.localeCompare(y.label));
        const fromB = await b.listDevices();

        expect(fromA.map((d) => [d.label, d.current])).toEqual([
          ["Laptop", true],
          ["Phone", false],
        ]);
        expect(fromB.find((d) => d.current)?.label).toBe("Phone");
        expect(Number.isNaN(Date.parse(fromA[0]?.lastSeenAt ?? ""))).toBe(false);
      });

      it("revokes a device, whose secret then stops working at once", async () => {
        const { a, b, joined } = await paired();

        await a.revokeDevice(joined.deviceId);

        await expect(b.pull(0)).rejects.toThrow(SyncUnauthorizedError);
        expect((await a.listDevices()).map((d) => d.label)).toEqual(["Laptop"]);
      });

      it("cannot revoke another account's device, which is not even visible to it", async () => {
        const { connect, device: a } = await registered(1);
        const other = connect(contractSecret(5));
        const theirs = await other.registerDevice("Elsewhere");

        await a.revokeDevice(theirs.deviceId);
        await a.revokeDevice(deviceId("no-such-device"));

        expect(await other.pull(0)).toMatchObject({ docs: [] });
      });

      it("registers a removed device's secret as a fresh account", async () => {
        const { a, b, identity, joined } = await paired();
        await a.revokeDevice(joined.deviceId);

        const fresh = await b.registerDevice("Phone");

        expect(fresh.accountId).not.toBe(identity.accountId);
      });
    });

    describe("accounts", () => {
      it("keeps accounts apart: one never sees another's documents", async () => {
        const { connect, device: a } = await registered(1);
        const other = connect(contractSecret(7));
        await other.registerDevice("Elsewhere");
        await a.push([item("mine")]);

        expect((await other.pull(0)).docs).toEqual([]);
      });

      it("deletes the account: every device on it stops working and a fresh registration starts empty", async () => {
        const { a, b } = await paired();
        await a.push([item("gone")]);

        await a.deleteAccount();

        await expect(a.pull(0)).rejects.toThrow(SyncUnauthorizedError);
        await expect(b.pull(0)).rejects.toThrow(SyncUnauthorizedError);
        await a.registerDevice("Laptop");
        expect((await a.pull(0)).docs).toEqual([]);
      });
    });
  });
};
