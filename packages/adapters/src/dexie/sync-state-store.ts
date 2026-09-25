import type { LedgerEntry, SyncState, SyncStateStore } from "@palier/app";
import { INITIAL_SYNC_STATE } from "@palier/app";

import type { LedgerRow, PalierDb, SyncStateRow } from "./db.js";

/**
 * The Dexie-backed `SyncStateStore`, on the `syncMeta` table architecture.md 9.1 already
 * declares — so no schema bump (progress.md D69). One row, `state`, holds the identity,
 * watermark, switch and last-sync time; each ledger entry is its own row under a
 * `ledger:` prefix, so `resetLedger` is one prefix delete and `record` one `bulkPut`.
 * The row ids are translated away at the edge: the port never sees them.
 */
const STATE_ID = "state";
const LEDGER_PREFIX = "ledger:";

const ledgerId = (entry: LedgerEntry): LedgerRow["id"] => `${LEDGER_PREFIX}${entry.type}:${entry.id}`;

const toState = (row: SyncStateRow | undefined): SyncState => {
  if (row === undefined) return INITIAL_SYNC_STATE;
  const { id: _id, ...state } = row;
  // A row written before a field existed reads that field's default (D74's flag, for one).
  return { ...INITIAL_SYNC_STATE, ...state };
};

const toEntry = (row: LedgerRow): LedgerEntry => ({
  type: row.type,
  id: row.id.slice(LEDGER_PREFIX.length + row.type.length + 1),
  revision: row.revision,
  hash: row.hash,
});

export const dexieSyncStateStore = (db: PalierDb): SyncStateStore => {
  const readState = async () => toState((await db.syncMeta.get(STATE_ID)) as SyncStateRow | undefined);
  const ledgerRows = () => db.syncMeta.where("id").startsWith(LEDGER_PREFIX);

  return {
    state: readState,
    update: (patch) =>
      db.transaction("rw", db.syncMeta, async () => {
        const next: SyncState = { ...(await readState()), ...patch };
        await db.syncMeta.put({ ...next, id: STATE_ID });
        return next;
      }),
    ledger: async () => (await ledgerRows().toArray()).map((row) => toEntry(row as LedgerRow)),
    record: async (entries) => {
      await db.syncMeta.bulkPut(entries.map((entry) => ({ ...entry, id: ledgerId(entry) })));
    },
    resetLedger: () =>
      db.transaction("rw", db.syncMeta, async () => {
        await ledgerRows().delete();
        await db.syncMeta.put({ ...(await readState()), watermark: 0, id: STATE_ID });
      }),
    clear: () => db.syncMeta.clear(),
  };
};
