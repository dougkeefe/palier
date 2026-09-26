import type { ApiKeyStorage, KeyVault } from "@palier/app";

/**
 * Mirrors the real vault's most important property: `withApiKey` hands the key
 * to a callback and never returns it, so there is no ergonomic way to park it
 * in a variable that ends up in state, a log or an error report
 * (implementation-plan.md 3.3, [R12]).
 *
 * It keeps the two modes apart as the Dexie vault does (progress.md D98): a
 * remembered key stands for the encrypted row, a tab-only key for the in-memory copy,
 * and putting one drops the other.
 */
export const memoryKeyVault = (deviceSecret = "test-device-secret"): KeyVault => {
  let held: { key: string; storage: ApiKeyStorage } | null = null;

  return {
    putApiKey: (key, options) => {
      held = { key, storage: (options?.remember ?? true) ? "device" : "tab" };
      return Promise.resolve();
    },
    withApiKey: (fn) => {
      if (held === null) {
        return Promise.reject(new Error("No API key has been stored."));
      }
      return fn(held.key);
    },
    hasApiKey: () => Promise.resolve(held !== null),
    apiKeyStorage: () => Promise.resolve(held?.storage ?? null),
    clear: () => {
      held = null;
      return Promise.resolve();
    },
    deviceSecret: () => Promise.resolve(deviceSecret),
  };
};
