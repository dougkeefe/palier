import { describe, expect, it } from "vitest";

import type { LedgerEntry, SyncStateStore } from "@palier/app";
import { INITIAL_SYNC_STATE, deviceId } from "@palier/app";

const entry = (id: string, revision: number, hash = "h"): LedgerEntry => ({ type: "attempt", id, revision, hash });
const identity = { accountId: "account-1", deviceId: deviceId("device-1") };

export const syncStateStoreContract = (name: string, make: () => Promise<SyncStateStore>): void => {
  describe(`SyncStateStore contract: ${name}`, () => {
    it("starts a fresh device switched on, unregistered, at watermark zero, with an empty ledger", async () => {
      const store = await make();

      expect(await store.state()).toEqual(INITIAL_SYNC_STATE);
      expect(await store.ledger()).toEqual([]);
    });

    it("merges an update into the state and returns the result", async () => {
      const store = await make();

      const after = await store.update({ identity, watermark: 7 });
      await store.update({ lastSyncedAt: "2026-09-24T12:00:00.000Z" });

      expect(after).toEqual({ ...INITIAL_SYNC_STATE, identity, watermark: 7 });
      expect(await store.state()).toEqual({
        ...INITIAL_SYNC_STATE,
        identity,
        watermark: 7,
        lastSyncedAt: "2026-09-24T12:00:00.000Z",
      });
    });

    it("upserts ledger entries by type and id", async () => {
      const store = await make();
      await store.record([entry("a", 1), entry("b", 2)]);
      await store.record([entry("a", 3, "h2"), { type: "schedule", id: "a", revision: 4, hash: "h" }]);

      const ledger = [...(await store.ledger())].sort((x, y) => x.revision - y.revision);
      expect(ledger).toEqual([entry("b", 2), entry("a", 3, "h2"), { type: "schedule", id: "a", revision: 4, hash: "h" }]);
    });

    it("forgets the ledger and the watermark on resetLedger, keeping identity and the switch", async () => {
      const store = await make();
      await store.update({ identity, watermark: 9, enabled: false });
      await store.record([entry("a", 1)]);

      await store.resetLedger();

      expect(await store.ledger()).toEqual([]);
      expect(await store.state()).toMatchObject({ identity, watermark: 0, enabled: false });
    });

    it("returns to a fresh device's state on clear", async () => {
      const store = await make();
      await store.update({ identity, watermark: 9, enabled: false });
      await store.record([entry("a", 1)]);

      await store.clear();

      expect(await store.state()).toEqual(INITIAL_SYNC_STATE);
      expect(await store.ledger()).toEqual([]);
    });
  });
};
