import type { KeyVault } from "@palier/app";

/**
 * Mirrors the real vault's most important property: `withApiKey` hands the key
 * to a callback and never returns it, so there is no ergonomic way to park it
 * in a variable that ends up in state, a log or an error report
 * (implementation-plan.md 3.3, [R12]).
 */
export const memoryKeyVault = (deviceSecret = "test-device-secret"): KeyVault => {
  let apiKey: string | null = null;

  return {
    putApiKey: (key) => {
      apiKey = key;
      return Promise.resolve();
    },
    withApiKey: (fn) => {
      if (apiKey === null) {
        return Promise.reject(new Error("No API key has been stored."));
      }
      return fn(apiKey);
    },
    hasApiKey: () => Promise.resolve(apiKey !== null),
    clear: () => {
      apiKey = null;
      return Promise.resolve();
    },
    deviceSecret: () => Promise.resolve(deviceSecret),
  };
};
