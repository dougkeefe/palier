import type { DeviceIdentity, SyncDocType } from "./sync-transport.js";
import type { ISO } from "./time.js";

/**
 * What this device remembers about sync, and nothing it would ever send: its identity
 * with the service, the pull watermark, the device-local on/off switch, and when it
 * last synced.
 *
 * `enabled` lives here and not in `SettingsStore` on purpose: settings sync, and the
 * off switch must not (turning sync off on the phone should not turn it off on the
 * laptop, product-requirements.md §8.11).
 */
export type SyncState = {
  readonly identity: DeviceIdentity | null;
  readonly watermark: number;
  readonly enabled: boolean;
  readonly lastSyncedAt: ISO | null;
  /**
   * A pair redeem failed in transit, so the server may or may not have moved this device
   * to the code's account. The next sync asks — registration is idempotent per secret —
   * and starts over only if the account really changed (progress.md D74).
   */
  readonly accountUnconfirmed: boolean;
};

export const INITIAL_SYNC_STATE: SyncState = {
  identity: null,
  watermark: 0,
  enabled: true,
  lastSyncedAt: null,
  accountUnconfirmed: false,
};

/**
 * What the device last agreed with the server about one document: the revision it
 * last saw and a hash of the record at that moment. A local record whose hash differs
 * is **dirty** — it changed since — and is pushed with `revision` as its base
 * (progress.md D69). Detecting change by diff rather than an outbox means no store's
 * write path knows sync exists, and an import or a merge is covered for free.
 */
export type LedgerEntry = {
  readonly type: SyncDocType;
  readonly id: string;
  readonly revision: number;
  readonly hash: string;
};

/**
 * Local persistence of sync bookkeeping. A port `implementation-plan.md` §3.3 does not
 * name, decided in progress.md D69 like `IdGenerator` was in D48: `SyncNow` needs a
 * watermark and a per-document base revision, and no existing store may hold them.
 *
 * - `state` returns `INITIAL_SYNC_STATE` on a fresh device; `update` merges a patch.
 * - `ledger` returns every entry; `record` upserts entries by `(type, id)`.
 * - `resetLedger` forgets every entry **and** the watermark, keeping identity and the
 *   switch — so the next sync offers the full local set, which is what turning sync
 *   back on and joining another account both need (architecture.md §9.4).
 * - `clear` forgets everything, back to `INITIAL_SYNC_STATE`.
 */
export type SyncStateStore = {
  state: () => Promise<SyncState>;
  update: (patch: Partial<SyncState>) => Promise<SyncState>;
  ledger: () => Promise<readonly LedgerEntry[]>;
  record: (entries: readonly LedgerEntry[]) => Promise<void>;
  resetLedger: () => Promise<void>;
  clear: () => Promise<void>;
};
