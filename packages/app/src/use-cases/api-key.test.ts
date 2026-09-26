import { describe, expect, it } from "vitest";

import type { AiProvider, ApiKeyStorage, KeyVault } from "../ports/index.js";
import {
  EmptyApiKeyError,
  NoApiKeyError,
  apiKeyStatus,
  checkApiKey,
  removeApiKey,
  saveApiKey,
  withAiProvider,
} from "./api-key.js";

/**
 * A local vault stub (D37) that knows when its callback is running, so a test can prove a
 * provider is made only while the vault is handing the key over.
 */
const vaultStub = () => {
  let held: { key: string; storage: ApiKeyStorage } | null = null;
  let inCallback = false;
  const puts: { key: string; remember: boolean | undefined }[] = [];
  const vault: KeyVault = {
    putApiKey: (key, options) => {
      puts.push({ key, remember: options?.remember });
      held = { key, storage: (options?.remember ?? true) ? "device" : "tab" };
      return Promise.resolve();
    },
    withApiKey: async (fn) => {
      if (held === null) throw new Error("no key");
      inCallback = true;
      try {
        return await fn(held.key);
      } finally {
        inCallback = false;
      }
    },
    hasApiKey: () => Promise.resolve(held !== null),
    apiKeyStorage: () => Promise.resolve(held?.storage ?? null),
    clear: () => {
      held = null;
      return Promise.resolve();
    },
    deviceSecret: () => Promise.resolve("device-secret"),
  };
  return { vault, puts, inCallback: () => inCallback };
};

const providerStub = (verify: () => Promise<void> = () => Promise.resolve()): AiProvider => ({
  capabilities: () => ({ generatePassage: false, generateItems: false, reviewItem: false }),
  generatePassage: () => Promise.reject(new Error("unused")),
  generateItems: () => Promise.reject(new Error("unused")),
  reviewItem: () => Promise.reject(new Error("unused")),
  verifyKey: verify,
  lastUsage: () => null,
});

describe("saveApiKey", () => {
  it("stores the key without the whitespace a paste brings", async () => {
    const { vault, puts } = vaultStub();
    await saveApiKey({ key: "  sk-pasted\n", remember: true }, { vault });
    expect(puts).toEqual([{ key: "sk-pasted", remember: true }]);
  });

  it("passes do-not-remember through to the vault", async () => {
    const { vault, puts } = vaultStub();
    await saveApiKey({ key: "sk-tab", remember: false }, { vault });
    expect(puts).toEqual([{ key: "sk-tab", remember: false }]);
    expect(await vault.apiKeyStorage()).toBe("tab");
  });

  it("refuses an empty or blank key, and stores nothing", async () => {
    const { vault, puts } = vaultStub();
    await expect(saveApiKey({ key: "   ", remember: true }, { vault })).rejects.toBeInstanceOf(EmptyApiKeyError);
    await expect(saveApiKey({ key: "", remember: true }, { vault })).rejects.toThrow("cannot be empty");
    expect(puts).toEqual([]);
  });
});

describe("apiKeyStatus", () => {
  it("is null when no key is held", async () => {
    expect(await apiKeyStatus({ vault: vaultStub().vault })).toBeNull();
  });

  it("says where the key is held and its last four characters, never the key", async () => {
    const { vault } = vaultStub();
    await saveApiKey({ key: "sk-secret-abcd", remember: true }, { vault });
    expect(await apiKeyStatus({ vault })).toEqual({ storage: "device", lastFour: "abcd" });

    await saveApiKey({ key: "sk-other-wxyz", remember: false }, { vault });
    const status = await apiKeyStatus({ vault });
    expect(status).toEqual({ storage: "tab", lastFour: "wxyz" });
    expect(JSON.stringify(status)).not.toContain("sk-other");
  });
});

describe("removeApiKey", () => {
  it("forgets the key", async () => {
    const { vault } = vaultStub();
    await saveApiKey({ key: "sk-gone", remember: true }, { vault });
    await removeApiKey({ vault });
    expect(await apiKeyStatus({ vault })).toBeNull();
  });
});

describe("withAiProvider — the only path from the key to a provider [R12]", () => {
  it("makes the provider from the key inside the vault's callback, once per call", async () => {
    const stub = vaultStub();
    await saveApiKey({ key: "sk-held", remember: true }, stub);
    const made: { key: string; inCallback: boolean }[] = [];
    const deps = {
      vault: stub.vault,
      aiProvider: (key: string) => {
        made.push({ key, inCallback: stub.inCallback() });
        return providerStub();
      },
    };

    await withAiProvider(deps, () => Promise.resolve("one"));
    const second = await withAiProvider(deps, () => Promise.resolve("two"));

    expect(second).toBe("two");
    expect(made).toEqual([
      { key: "sk-held", inCallback: true },
      { key: "sk-held", inCallback: true },
    ]);
  });

  it("caches nothing: once the key is removed, the next call has no provider to use", async () => {
    const stub = vaultStub();
    await saveApiKey({ key: "sk-held", remember: true }, stub);
    let made = 0;
    const deps = {
      vault: stub.vault,
      aiProvider: () => {
        made += 1;
        return providerStub();
      },
    };
    await withAiProvider(deps, () => Promise.resolve());
    await removeApiKey(stub);

    await expect(withAiProvider(deps, () => Promise.resolve())).rejects.toBeInstanceOf(NoApiKeyError);
    expect(made).toBe(1);
  });

  it("rejects with NoApiKeyError, never the vault's own error, when no key is held", async () => {
    const deps = { vault: vaultStub().vault, aiProvider: () => providerStub() };
    await expect(withAiProvider(deps, () => Promise.resolve())).rejects.toThrow("No API key is held.");
  });
});

describe("checkApiKey", () => {
  it("resolves when the provider accepts the key", async () => {
    const stub = vaultStub();
    await saveApiKey({ key: "sk-good", remember: true }, stub);
    let checked = 0;
    await checkApiKey({
      vault: stub.vault,
      aiProvider: () =>
        providerStub(() => {
          checked += 1;
          return Promise.resolve();
        }),
    });
    expect(checked).toBe(1);
  });

  it("rejects with the provider's own error, for the caller to put in words", async () => {
    const stub = vaultStub();
    await saveApiKey({ key: "sk-bad", remember: true }, stub);
    class InvalidApiKeyError extends Error {}
    await expect(
      checkApiKey({ vault: stub.vault, aiProvider: () => providerStub(() => Promise.reject(new InvalidApiKeyError())) }),
    ).rejects.toBeInstanceOf(InvalidApiKeyError);
  });

  it("rejects with NoApiKeyError when there is nothing to check", async () => {
    await expect(checkApiKey({ vault: vaultStub().vault, aiProvider: () => providerStub() })).rejects.toBeInstanceOf(
      NoApiKeyError,
    );
  });
});
