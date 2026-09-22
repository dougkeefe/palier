import type { SettingsStore } from "@palier/app";

import type { PalierDb } from "./db.js";

/**
 * The Dexie-backed `SettingsStore` (architecture.md 9.1, `settings: 'key'`). A typed
 * key/value store; `get` returns null for an absent key rather than throwing, so a
 * first run is not an error. IndexedDB's structured clone round-trips the structured
 * values the contract stores (`{ enabled, devices }`) unchanged.
 *
 * The `<T>` casts are the honest edge of an untyped store: IndexedDB hands back
 * `unknown`, and the caller names the type it wrote — the same shape as the in-memory
 * implementation and the port itself.
 */
export const dexieSettingsStore = (db: PalierDb): SettingsStore => ({
  get: async <T>(key: string) => {
    const row = await db.settings.get(key);
    return row === undefined ? null : (row.value as T);
  },
  set: async <T>(key: string, value: T) => {
    await db.settings.put({ key, value });
  },
});
