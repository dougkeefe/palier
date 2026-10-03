import type { KeyVault } from "@palier/app";

import type { ApiKeyRow, DeviceKeyRow, DeviceSecretRow, PalierDb, RealtimeEndpointRow } from "./db.js";

/**
 * The Dexie-backed `KeyVault` (architecture.md 6.2). The user's OpenAI key is stored in
 * IndexedDB **encrypted at rest with AES-GCM** under a device-bound key. `withApiKey` hands
 * the plaintext to a callback and never returns it, and there is deliberately no `getApiKey`
 * — the shape is the control [R12].
 *
 * The wrapping key is a **non-extractable** `CryptoKey` held in IndexedDB, exactly as §6.2
 * specifies. Non-extractable is the load-bearing word: an attacker who can read IndexedDB
 * (a browser extension, say) gets an opaque handle whose raw bytes Web Crypto refuses to
 * export, so the key cannot be decrypted offline or in another origin. It does **not**
 * defend against a full XSS compromise of our own origin, which could call `decrypt` with
 * the handle, and §6.2 says so rather than implying otherwise.
 *
 * A `CryptoKey` round-trips through IndexedDB's structured clone (verified against
 * `fake-indexeddb` too), so nothing needs to be derived from a persisted secret — an earlier
 * plan to HKDF a key from stored bytes was dropped because those bytes plus the (public) HKDF
 * parameters would let a storage-reader decrypt offline, giving up the very protection above
 * (progress.md D50).
 *
 * The `device-secret` is a separate value used only as the sync identity seed (§9.3), so
 * `clear` wipes the API key but not the secret or the wrapping key.
 *
 * **Do-not-remember mode** (§6.2, progress.md D98): a key put with `remember: false` lives in
 * this closure and nowhere else. The composition root builds one vault per page load, so the
 * closure is the tab's, and a reload forgets it. Putting it deletes any stored ciphertext
 * first; putting a remembered key drops it.
 *
 * **The realtime endpoint** (progress.md D192) is one more row, held as written: a URL, not a secret. It is in
 * this table, not the settings, because settings sync and it must not. `clear` deletes it with the key.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SECRET_BYTES = 32;
const IV_BYTES = 12;
const DEVICE_KEY_ID = "device-key";
const SECRET_ID = "device-secret";
const KEY_ID = "api-key";
const ENDPOINT_ID = "realtime-endpoint";

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Copy any `Uint8Array` into a fresh, `ArrayBuffer`-backed one. Web Crypto's `BufferSource`
 * is `ArrayBufferView<ArrayBuffer>`, and TS 5.9 types bytes read back from IndexedDB as
 * `Uint8Array<ArrayBufferLike>`, which is not assignable because `ArrayBufferLike` admits
 * `SharedArrayBuffer`. The copy is a handful of bytes; correctness beats the saved allocation.
 */
const asBuffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(bytes);

export const dexieKeyVault = (db: PalierDb): KeyVault => {
  /**
   * The device-bound wrapping key, created once. The fast path reads it; if absent, a fresh
   * key is generated **outside** the transaction (Dexie forbids awaiting a non-IDB promise
   * inside one), then a serialized read-write transaction double-checks and creates it, so
   * two concurrent first-time callers converge on one key rather than racing.
   */
  const deviceKey = async (): Promise<CryptoKey> => {
    const existing = await db.keyVault.get(DEVICE_KEY_ID);
    if (existing !== undefined && existing.id === DEVICE_KEY_ID) return existing.key;
    const fresh = await globalThis.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
    return db.transaction("rw", db.keyVault, async () => {
      const race = await db.keyVault.get(DEVICE_KEY_ID);
      if (race !== undefined && race.id === DEVICE_KEY_ID) return race.key;
      const row: DeviceKeyRow = { id: DEVICE_KEY_ID, key: fresh };
      await db.keyVault.put(row);
      return fresh;
    });
  };

  const deviceSecretBytes = async (): Promise<Uint8Array> => {
    const existing = await db.keyVault.get(SECRET_ID);
    if (existing !== undefined && existing.id === SECRET_ID) return existing.bytes;
    const fresh = globalThis.crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
    return db.transaction("rw", db.keyVault, async () => {
      const race = await db.keyVault.get(SECRET_ID);
      if (race !== undefined && race.id === SECRET_ID) return race.bytes;
      const row: DeviceSecretRow = { id: SECRET_ID, bytes: fresh };
      await db.keyVault.put(row);
      return fresh;
    });
  };

  /** The do-not-remember key, for this tab only. Never written anywhere. */
  let tabKey: string | null = null;

  const storedRow = async (): Promise<ApiKeyRow | null> => {
    const row = await db.keyVault.get(KEY_ID);
    return row !== undefined && row.id === KEY_ID ? row : null;
  };

  return {
    putApiKey: async (key, options) => {
      if (!(options?.remember ?? true)) {
        await db.keyVault.delete(KEY_ID);
        tabKey = key;
        return;
      }
      tabKey = null;
      const wrappingKey = await deviceKey();
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const ciphertext = await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        wrappingKey,
        asBuffer(encoder.encode(key)),
      );
      const row: ApiKeyRow = { id: KEY_ID, iv, ciphertext: new Uint8Array(ciphertext) };
      await db.keyVault.put(row);
    },
    withApiKey: async (fn) => {
      if (tabKey !== null) return fn(tabKey);
      const row = await storedRow();
      if (row === null) {
        throw new Error("No API key has been stored.");
      }
      const plaintext = await globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: asBuffer(row.iv) },
        await deviceKey(),
        asBuffer(row.ciphertext),
      );
      return fn(decoder.decode(plaintext));
    },
    hasApiKey: async () => tabKey !== null || (await storedRow()) !== null,
    apiKeyStorage: async () => {
      if (tabKey !== null) return "tab";
      return (await storedRow()) === null ? null : "device";
    },
    clear: async () => {
      tabKey = null;
      await db.keyVault.bulkDelete([KEY_ID, ENDPOINT_ID]);
    },
    deviceSecret: async () => toHex(await deviceSecretBytes()),
    realtimeEndpoint: async () => {
      const row = await db.keyVault.get(ENDPOINT_ID);
      return row !== undefined && row.id === ENDPOINT_ID ? row.url : null;
    },
    setRealtimeEndpoint: async (url) => {
      if (url === null) {
        await db.keyVault.delete(ENDPOINT_ID);
        return;
      }
      const row: RealtimeEndpointRow = { id: ENDPOINT_ID, url };
      await db.keyVault.put(row);
    },
  };
};
