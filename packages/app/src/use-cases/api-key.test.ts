import { describe, expect, it } from "vitest";

import type { UsageRecord } from "@palier/domain";
import { sessionId } from "@palier/domain";

import type { AiProvider, ApiKeyStorage, CostEntry, CostLedger, KeyVault } from "../ports/index.js";
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
    realtimeEndpoint: () => Promise.resolve(null),
    setRealtimeEndpoint: () => Promise.resolve(),
  };
  return { vault, puts, inCallback: () => inCallback };
};

/** A local ledger stub (D37) and a fixed clock, for the metered path. */
const ledgerStub = () => {
  const entries: CostEntry[] = [];
  const ledger: CostLedger = {
    append: (entry) => {
      entries.push(entry);
      return Promise.resolve();
    },
    since: () => Promise.resolve(entries),
    clear: () => Promise.resolve(),
  };
  return { ledger, entries };
};
const NOW = "2026-09-26T12:00:00.000Z";
const clock = { now: () => NOW };

const providerStub = (verify: () => Promise<void> = () => Promise.resolve()): AiProvider => ({
  capabilities: () => ({ generatePassage: false, generateItems: false, reviewItem: false, assessWriting: false, generateScenario: false, transcribe: false, speak: false, examinerTurn: false, assessOral: false }),
  generatePassage: () => Promise.reject(new Error("unused")),
  generateItems: () => Promise.reject(new Error("unused")),
  reviewItem: () => Promise.reject(new Error("unused")),
  assessWriting: () => Promise.reject(new Error("unused")),
  generateScenario: () => Promise.reject(new Error("unused")),
  transcribe: () => Promise.reject(new Error("unused")),
  speak: () => Promise.reject(new Error("unused")),
  examinerTurn: () => Promise.reject(new Error("unused")),
  assessOral: () => Promise.reject(new Error("unused")),
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
      ledger: ledgerStub().ledger,
      clock,
      aiProvider: (key: string) => {
        made.push({ key, inCallback: stub.inCallback() });
        return providerStub();
      },
    };

    await withAiProvider(deps, "writing-feedback", () => Promise.resolve("one"));
    const second = await withAiProvider(deps, "writing-feedback", () => Promise.resolve("two"));

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
      ledger: ledgerStub().ledger,
      clock,
      aiProvider: () => {
        made += 1;
        return providerStub();
      },
    };
    await withAiProvider(deps, "item-generation", () => Promise.resolve());
    await removeApiKey(stub);

    await expect(withAiProvider(deps, "item-generation", () => Promise.resolve())).rejects.toBeInstanceOf(
      NoApiKeyError,
    );
    expect(made).toBe(1);
  });

  it("rejects with NoApiKeyError, never the vault's own error, when no key is held", async () => {
    const deps = { vault: vaultStub().vault, ledger: ledgerStub().ledger, clock, aiProvider: () => providerStub() };
    await expect(withAiProvider(deps, "item-generation", () => Promise.resolve())).rejects.toThrow(
      "No API key is held.",
    );
  });
});

/**
 * A provider whose every call reports the usage it is told to, as the adapter does (D102):
 * the whole of the last call, or null when it billed nothing.
 */
const spendingProvider = (usages: (UsageRecord | null)[], fail = false) => {
  let usage: UsageRecord | null = null;
  const next = () => {
    usage = usages.shift() ?? null;
    return fail ? Promise.reject(new Error("malformed twice")) : Promise.resolve();
  };
  const provider: AiProvider & { openVoiceSession: () => Promise<string> } = {
    capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true, assessWriting: true, generateScenario: true, transcribe: true, speak: true, examinerTurn: true, assessOral: true }),
    generatePassage: () => next().then(() => []),
    generateItems: () => next().then(() => []),
    reviewItem: () => next().then(() => ({}) as never),
    assessWriting: () => next().then(() => ({}) as never),
    generateScenario: () => next().then(() => ({ phases: [] })),
    transcribe: () => next().then(() => ({ text: "" })),
    speak: () => next().then(() => new Blob()),
    examinerTurn: () => next().then(() => ({ text: "q", difficulty: null })),
    assessOral: () => next().then(() => ({}) as never),
    // Not on the port yet (Phase 6): stands in for a capability added later. It was
    // `assessWriting` until Phase 4 Slice 3 put that on the port (progress.md D105), and
    // `assessOral` until Phase 5 Slice 3 did (D122).
    openVoiceSession: () => next().then(() => "assessed"),
    verifyKey: () => {
      usage = { model: "never-billed", inputTokens: 1, outputTokens: 1, costUsd: 1 };
      return Promise.resolve();
    },
    lastUsage: () => usage,
  };
  return provider;
};

describe("withAiProvider — every call is written to the cost ledger (D101)", () => {
  const setUp = async (provider: AiProvider) => {
    const stub = vaultStub();
    await saveApiKey({ key: "sk-held", remember: true }, stub);
    const { ledger, entries } = ledgerStub();
    return { deps: { vault: stub.vault, ledger, clock, aiProvider: () => provider }, entries };
  };

  it("records each call's usage under the feature and the clock's time", async () => {
    const { deps, entries } = await setUp(
      spendingProvider([
        { model: "m-draft", inputTokens: 100, outputTokens: 50, costUsd: 0.25 },
        { model: "m-review", inputTokens: 10, outputTokens: 5 },
      ]),
    );

    await withAiProvider(deps, "item-generation", async (ai) => {
      await ai.generateItems({} as never);
      await ai.reviewItem({} as never);
    });

    expect(entries).toEqual([
      { ts: NOW, feature: "item-generation", model: "m-draft", inputTokens: 100, outputTokens: 50, costUsd: 0.25 },
      // Unpriced: the ledger says so with null, rather than a zero that reads as free.
      { ts: NOW, feature: "item-generation", model: "m-review", inputTokens: 10, outputTokens: 5, costUsd: null },
    ]);
  });

  it("records each call under the spoken session it is for, when tagged, and under none otherwise (D125)", async () => {
    const { deps, entries } = await setUp(
      spendingProvider([
        { model: "m-examiner", inputTokens: 10, outputTokens: 5, costUsd: 0.001 },
        { model: "m-assess", inputTokens: 20, outputTokens: 10, costUsd: 0.002 },
      ]),
    );

    await withAiProvider(deps, "oral-practice", (ai) => ai.examinerTurn({} as never), { sessionId: sessionId("oral-9") });
    await withAiProvider(deps, "oral-assessment", (ai) => ai.assessOral({} as never));

    expect(entries.map((e) => e.sessionId)).toEqual([sessionId("oral-9"), undefined]);
    expect("sessionId" in (entries[1] ?? {})).toBe(false);
  });

  it("records a call that failed after it was billed, and still rejects with its error", async () => {
    const { deps, entries } = await setUp(
      spendingProvider([{ model: "m", inputTokens: 40, outputTokens: 40, costUsd: 0.1 }], true),
    );

    await expect(withAiProvider(deps, "writing-feedback", (ai) => ai.reviewItem({} as never))).rejects.toThrow(
      "malformed twice",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.costUsd).toBe(0.1);
  });

  it("records nothing for a call that billed nothing", async () => {
    const { deps, entries } = await setUp(spendingProvider([null], true));
    await expect(withAiProvider(deps, "writing-feedback", (ai) => ai.generatePassage({} as never))).rejects.toThrow();
    expect(entries).toEqual([]);
  });

  it("meters a capability the port gains later, without an edit to the wrapper", async () => {
    const { deps, entries } = await setUp(spendingProvider([{ model: "m", inputTokens: 1, outputTokens: 2 }]));
    const result = await withAiProvider(deps, "writing-feedback", (ai) =>
      (ai as unknown as { openVoiceSession: () => Promise<string> }).openVoiceSession(),
    );
    expect(result).toBe("assessed");
    expect(entries.map((e) => e.feature)).toEqual(["writing-feedback"]);
  });

  it("never meters the key check, capabilities or lastUsage, which spend nothing", async () => {
    const provider = spendingProvider([]);
    const { deps, entries } = await setUp(provider);
    await withAiProvider(deps, "writing-feedback", async (ai) => {
      await ai.verifyKey();
      ai.capabilities();
      expect(ai.lastUsage()).toMatchObject({ model: "never-billed" });
    });
    expect(entries).toEqual([]);
  });
});

describe("checkApiKey", () => {
  it("needs no ledger: a key check spends nothing, so nothing records it", async () => {
    const stub = vaultStub();
    await saveApiKey({ key: "sk-good", remember: true }, stub);
    // AiDeps, not MeteredAiDeps: there is no ledger here to write to.
    await expect(checkApiKey({ vault: stub.vault, aiProvider: () => spendingProvider([]) })).resolves.toBeUndefined();
  });

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
