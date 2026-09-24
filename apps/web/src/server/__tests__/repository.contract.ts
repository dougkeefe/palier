import { describe, expect, it } from "vitest";

import type { SyncRepository } from "../repository";

const AT = "2026-09-24T12:00:00.000Z";
const LATER = "2026-09-24T12:05:00.000Z";
const setting = (id: string, baseRevision: number | null = null, payload: Record<string, unknown> = { v: id }) => ({
  type: "setting" as const,
  id,
  baseRevision,
  payload,
});

/**
 * The `SyncRepository` contract: run against the in-memory repository in the fast lane
 * and against Drizzle on PGlite, with the real migrations, in the integration lane
 * (implementation-plan.md §6.2 tier 4: "the real Drizzle schema … no mocked database").
 */
export const syncRepositoryContract = (name: string, make: () => Promise<SyncRepository>): void => {
  describe(`SyncRepository contract: ${name}`, () => {
    const withAccount = async (hash = "hash-a") => {
      const repo = await make();
      const created = await repo.createAccount({ hash, label: "Laptop", at: AT });
      return { repo, ...created };
    };

    it("creates an account with its first device, found by the secret's hash", async () => {
      const { repo, accountId, deviceId } = await withAccount();

      expect(await repo.deviceBySecretHash("hash-a")).toEqual({
        id: deviceId,
        accountId,
        label: "Laptop",
        lastSeenAt: AT,
        revokedAt: null,
      });
      expect(await repo.deviceBySecretHash("nobody")).toBeNull();
    });

    it("stamps a device as seen", async () => {
      const { repo, deviceId } = await withAccount();
      await repo.touchDevice(deviceId, LATER);

      expect((await repo.deviceBySecretHash("hash-a"))?.lastSeenAt).toBe(LATER);
    });

    it("replaces a removed device's row when the same secret registers again", async () => {
      const { repo, accountId, deviceId } = await withAccount();
      await repo.revokeDevice(accountId, deviceId, AT);

      const fresh = await repo.createAccount({ hash: "hash-a", label: "Laptop", at: LATER });

      expect(fresh.accountId).not.toBe(accountId);
      expect(await repo.deviceBySecretHash("hash-a")).toMatchObject({ accountId: fresh.accountId, revokedAt: null });
    });

    it("pushes new documents with increasing revisions and pulls them in order, paged", async () => {
      const { repo, accountId, deviceId } = await withAccount();

      const pushed = await repo.push(accountId, deviceId, [setting("a"), setting("b"), setting("c")], AT);
      const page = await repo.pull(accountId, 0, 2);
      const rest = await repo.pull(accountId, page.docs.at(-1)?.revision ?? 0, 2);

      expect(pushed.accepted.map((a) => a.revision)).toEqual([1, 2, 3]);
      expect(page).toEqual({
        docs: [
          { type: "setting", id: "a", revision: 1, payload: { v: "a" } },
          { type: "setting", id: "b", revision: 2, payload: { v: "b" } },
        ],
        more: true,
      });
      expect(rest).toEqual({ docs: [{ type: "setting", id: "c", revision: 3, payload: { v: "c" } }], more: false });
    });

    it("takes a write on the current base, refuses a stale or missing base with the current copy", async () => {
      const { repo, accountId, deviceId } = await withAccount();
      await repo.push(accountId, deviceId, [setting("a")], AT);

      const ok = await repo.push(accountId, deviceId, [setting("a", 1, { v: "a2" })], AT);
      const stale = await repo.push(accountId, deviceId, [setting("a", 1, { v: "stale" }), setting("a", null)], AT);

      expect(ok).toEqual({ accepted: [{ type: "setting", id: "a", revision: 2 }], conflicts: [] });
      expect(stale.accepted).toEqual([]);
      expect(stale.conflicts).toEqual([
        { type: "setting", id: "a", revision: 2, payload: { v: "a2" } },
        { type: "setting", id: "a", revision: 2, payload: { v: "a2" } },
      ]);
    });

    it("keeps one account's documents out of another's pull", async () => {
      const a = await withAccount("hash-a");
      const b = await a.repo.createAccount({ hash: "hash-b", label: "Other", at: AT });
      await a.repo.push(a.accountId, a.deviceId, [setting("mine")], AT);

      expect(await a.repo.pull(b.accountId, 0, 10)).toEqual({ docs: [], more: false });
    });

    it("keeps documents of two types with one id apart", async () => {
      const { repo, accountId, deviceId } = await withAccount();
      await repo.push(accountId, deviceId, [setting("x"), { type: "attempt", id: "x", baseRevision: null, payload: { k: 1 } }], AT);

      expect((await repo.pull(accountId, 0, 10)).docs.map((d) => d.type).sort()).toEqual(["attempt", "setting"]);
    });

    it("spends a pairing code once, and only before it expires", async () => {
      const { repo, accountId } = await withAccount();
      await repo.createPairCode(accountId, { hash: "code-1", expiresAt: LATER });
      await repo.createPairCode(accountId, { hash: "code-2", expiresAt: AT });

      expect(await repo.redeemPairCode({ hash: "code-1", at: AT })).toBe(accountId);
      expect(await repo.redeemPairCode({ hash: "code-1", at: AT })).toBeNull();
      expect(await repo.redeemPairCode({ hash: "code-2", at: AT })).toBeNull();
      expect(await repo.redeemPairCode({ hash: "never", at: AT })).toBeNull();
    });

    it("attaches a device to an account, and drops the account it left if nothing else is on it", async () => {
      const a = await withAccount("hash-a");
      const b = await a.repo.createAccount({ hash: "hash-b", label: "Phone", at: AT });
      await a.repo.push(b.accountId, b.deviceId, [setting("orphan")], AT);

      const { deviceId } = await a.repo.attachDevice(a.accountId, { hash: "hash-b", label: "Phone", at: LATER });

      expect(await a.repo.deviceBySecretHash("hash-b")).toMatchObject({ id: deviceId, accountId: a.accountId });
      expect((await a.repo.listDevices(a.accountId)).map((d) => d.label).sort()).toEqual(["Laptop", "Phone"]);
      expect(await a.repo.pull(b.accountId, 0, 10)).toEqual({ docs: [], more: false });
    });

    it("attaches a brand-new secret without touching any other account", async () => {
      const a = await withAccount("hash-a");

      await a.repo.attachDevice(a.accountId, { hash: "hash-new", label: "Tablet", at: AT });

      expect(await a.repo.listDevices(a.accountId)).toHaveLength(2);
    });

    it("revokes only a live device of the caller's own account", async () => {
      const a = await withAccount("hash-a");
      const b = await a.repo.createAccount({ hash: "hash-b", label: "Other", at: AT });

      expect(await a.repo.revokeDevice(a.accountId, b.deviceId, AT)).toBe(false);
      expect(await a.repo.revokeDevice(a.accountId, a.deviceId, AT)).toBe(true);
      expect(await a.repo.revokeDevice(a.accountId, a.deviceId, AT)).toBe(false);
      expect(await a.repo.listDevices(a.accountId)).toEqual([]);
      expect((await a.repo.deviceBySecretHash("hash-a"))?.revokedAt).toBe(AT);
    });

    it("deletes an account with its devices, documents and codes", async () => {
      const { repo, accountId, deviceId } = await withAccount();
      await repo.push(accountId, deviceId, [setting("gone")], AT);
      await repo.createPairCode(accountId, { hash: "code", expiresAt: LATER });

      await repo.deleteAccount(accountId);

      expect(await repo.deviceBySecretHash("hash-a")).toBeNull();
      expect(await repo.pull(accountId, 0, 10)).toEqual({ docs: [], more: false });
      expect(await repo.redeemPairCode({ hash: "code", at: AT })).toBeNull();
    });

    it("counts rate-limit hits per key within a window, and starts again in the next", async () => {
      const repo = await make();

      expect(await repo.hit("k", AT)).toBe(1);
      expect(await repo.hit("k", AT)).toBe(2);
      expect(await repo.hit("other", AT)).toBe(1);
      expect(await repo.hit("k", LATER)).toBe(1);
    });
  });
};
