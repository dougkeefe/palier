import type { LedgerEntry, SyncState, SyncStateStore } from "@palier/app";
import { INITIAL_SYNC_STATE } from "@palier/app";

/** An in-memory `SyncStateStore`: one state value and a ledger `Map` keyed by `type:id`. */
export const memorySyncStateStore = (): SyncStateStore => {
  let state: SyncState = INITIAL_SYNC_STATE;
  const ledger = new Map<string, LedgerEntry>();

  return {
    state: () => Promise.resolve(state),
    update: (patch) => {
      state = { ...state, ...patch };
      return Promise.resolve(state);
    },
    ledger: () => Promise.resolve([...ledger.values()]),
    record: (entries) => {
      for (const entry of entries) ledger.set(`${entry.type}:${entry.id}`, entry);
      return Promise.resolve();
    },
    resetLedger: () => {
      ledger.clear();
      state = { ...state, watermark: 0 };
      return Promise.resolve();
    },
    clear: () => {
      ledger.clear();
      state = INITIAL_SYNC_STATE;
      return Promise.resolve();
    },
  };
};
