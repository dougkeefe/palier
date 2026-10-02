/**
 * Custody of the user's OpenAI key and the device secret (implementation-plan.md
 * 3.3, ADR 2, ADR 3).
 *
 * `withApiKey` hands the key to a callback and never returns it, so there is no
 * ergonomic way to park it in a variable that ends up in state, a log or an
 * error report [R12]. **Do not add a `getApiKey`** — the shape is the control.
 *
 * **Do-not-remember mode** (architecture.md §6.2, progress.md D98): a key put with
 * `remember: false` is held for this tab only. It is never written to storage, and any key
 * stored before is deleted, so a reload forgets it. A remembered key replaces a tab-only
 * one the same way. `withApiKey` reads whichever is held, and `clear` forgets both.
 *
 * **The realtime endpoint** (ADR 3's self-hosted escape, progress.md D192): the user's own page
 * that mints studio mode's secret, so the key never reaches Palier's route. It is where the key
 * may go, so it is kept with the key: on this device only, never synced (a URL can name a person,
 * architecture.md §12) and never exported, as the key is not. `clear` forgets it with the key, so
 * the one-tap wipe leaves nothing behind. It is a URL, not a secret, so it is stored as it is.
 */
export type KeyVault = {
  /** Store the key. `remember` defaults to `true`; `false` keeps it for this tab only. */
  putApiKey: (key: string, options?: { readonly remember: boolean }) => Promise<void>;
  withApiKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  hasApiKey: () => Promise<boolean>;
  /** Where the key is held: on this device (encrypted), for this tab only, or nowhere. */
  apiKeyStorage: () => Promise<ApiKeyStorage | null>;
  /** Forget the key, in both modes, and the realtime endpoint. */
  clear: () => Promise<void>;
  deviceSecret: () => Promise<string>;
  /** The user's own realtime secret endpoint, or `null` for Palier's route (D192). */
  realtimeEndpoint: () => Promise<string | null>;
  /** Keep the endpoint on this device, or forget it with `null`. The caller has checked it. */
  setRealtimeEndpoint: (url: string | null) => Promise<void>;
};

/** `device`: encrypted at rest on this device. `tab`: in memory, for this tab only. */
export type ApiKeyStorage = "device" | "tab";
