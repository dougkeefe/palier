import type {
  AttemptStore,
  KeyVault,
  ScheduleStore,
  SessionStore,
  SettingsStore,
} from "@palier/app";

import { dexieAttemptStore } from "./attempt-store.js";
import { PalierDb } from "./db.js";
import { dexieKeyVault } from "./key-vault.js";
import { dexieScheduleStore } from "./schedule-store.js";
import { dexieSessionStore } from "./session-store.js";
import { dexieSettingsStore } from "./settings-store.js";

/**
 * The five local store ports, all bound to one `PalierDb`. This is the whole public
 * surface of the Dexie adapter, and deliberately so: every field is a port type from
 * `@palier/app`, so **no Dexie type crosses the package boundary** (§2.4, the adapter's
 * first invariant). `PalierDb` extends `Dexie` and exposes `Table<...>` accessors, so
 * exporting it would put a vendor type in the published `.d.ts` — and, under pnpm's
 * strict isolation, would make the composition root's typecheck reach for `dexie`, which
 * the vendor ban forbids it. The composition root wires production adapters by calling
 * this one function; `PalierDb` and the per-store factories stay internal (the tests
 * reach them by relative import, which the boundary rules allow).
 */
export type DexieStores = {
  readonly attempts: AttemptStore;
  readonly schedule: ScheduleStore;
  readonly sessions: SessionStore;
  readonly settings: SettingsStore;
  readonly keyVault: KeyVault;
};

export const dexieStores = (name = "palier"): DexieStores => {
  const db = new PalierDb(name);
  return {
    attempts: dexieAttemptStore(db),
    schedule: dexieScheduleStore(db),
    sessions: dexieSessionStore(db),
    settings: dexieSettingsStore(db),
    keyVault: dexieKeyVault(db),
  };
};
