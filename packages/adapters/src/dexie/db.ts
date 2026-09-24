import type { ISO, LedgerEntry, ScheduleEntry, SyncState } from "@palier/app";
import type { Attempt, AttemptId, AttemptMode, ItemId, SessionId } from "@palier/domain";
import { Dexie, type Table } from "dexie";

/**
 * The local IndexedDB database, one Dexie instance per app (architecture.md 9.1).
 *
 * The `stores()` block below is the documented schema version 1 **verbatim**, all
 * thirteen tables, even though only six have adapters today (attempts, schedule,
 * sessions, settings, keyVault, syncMeta). Declaring the whole of v1 now means the remaining
 * adapters land without a schema bump — a `version(2)` is reserved for a real shape
 * change, not for turning on a table the schema already anticipated. The unused
 * tables are inert: nothing reads or writes them until their adapter exists.
 *
 * **Why getters, not `field!: Table<...>` declarations.** `tsconfig.base.json` targets
 * ES2022 and does not set `useDefineForClassFields`, so it defaults to `true`; a class
 * field declaration would emit `attempts = undefined` in the constructor and clobber the
 * table object Dexie assigns in `super()`. Lazy getters over `this.table(name)` sidestep
 * that entirely and stay strongly typed.
 */

/** The `sessions` row. Its indexed column is `type` (9.1); the port speaks `mode`. */
export type SessionRow = {
  readonly id: SessionId;
  readonly type: AttemptMode;
  readonly startedAt: ISO;
  readonly completedAt: ISO | null;
};

/** The `settings` row: a typed value under a string key. */
export type SettingRow = {
  readonly key: string;
  readonly value: unknown;
};

/**
 * The device-bound wrapping key — a **non-extractable** AES-GCM `CryptoKey` held in
 * IndexedDB (architecture.md 6.2). Because it is non-extractable, an attacker who can
 * read IndexedDB gets an opaque handle whose raw bytes Web Crypto refuses to export, so
 * the API key cannot be decrypted offline or in another origin — the property §6.2 wants.
 */
export type DeviceKeyRow = {
  readonly id: "device-key";
  readonly key: CryptoKey;
};

/** The device secret used as the sync identity seed (architecture.md 9.3), not for encryption. */
export type DeviceSecretRow = {
  readonly id: "device-secret";
  readonly bytes: Uint8Array;
};

/** The API key at rest: AES-GCM ciphertext and its per-write IV, never the plaintext. */
export type ApiKeyRow = {
  readonly id: "api-key";
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
};

/** Every row the `keyVault` table holds, discriminated by `id`. */
export type KeyVaultRow = DeviceKeyRow | DeviceSecretRow | ApiKeyRow;

/** The one sync-state row: identity, watermark, switch, last sync (progress.md D69). */
export type SyncStateRow = SyncState & { readonly id: "state" };

/** One ledger entry, keyed `ledger:<type>:<id>` so a prefix query finds them all. */
export type LedgerRow = LedgerEntry & { readonly id: `ledger:${string}` };

/** Every row the `syncMeta` table holds, discriminated by `id`. */
export type SyncMetaRow = SyncStateRow | LedgerRow;

export class PalierDb extends Dexie {
  constructor(name = "palier") {
    super(name);
    // architecture.md 9.1, unchanged. `box` is a field of `schedule`, not an index —
    // nothing queries on it. `schedule.due` is nullable and IndexedDB does not index a
    // null key path, so a retired entry drops out of the `due` index while staying
    // reachable by its `itemId` primary key. That exclusion is load-bearing (§9.1).
    this.version(1).stores({
      profile: "id",
      attempts: "id, itemId, skill, ts, sessionId",
      schedule: "itemId, due, skill",
      sessions: "id, type, startedAt",
      examRuns: "id, formId, startedAt, submittedAt",
      oralSessions: "id, scenarioId, startedAt",
      oralAudio: "sessionId",
      vocab: "id, term, lang, due",
      generated: "id, skill, createdAt",
      costLedger: "++id, ts, feature",
      settings: "key",
      keyVault: "id",
      syncMeta: "id",
    });
  }

  get attempts(): Table<Attempt, AttemptId> {
    return this.table("attempts");
  }

  get schedule(): Table<ScheduleEntry, ItemId> {
    return this.table("schedule");
  }

  get sessions(): Table<SessionRow, SessionId> {
    return this.table("sessions");
  }

  get settings(): Table<SettingRow, string> {
    return this.table("settings");
  }

  get keyVault(): Table<KeyVaultRow, string> {
    return this.table("keyVault");
  }

  get syncMeta(): Table<SyncMetaRow, string> {
    return this.table("syncMeta");
  }
}
