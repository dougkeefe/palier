import type { AiFeature, UsageRecord } from "@palier/domain";

import type {
  AiProvider,
  AiProviderFactory,
  ApiKeyStorage,
  Clock,
  CostLedger,
  KeyVault,
} from "../ports/index.js";

/**
 * The user's OpenAI key, from entry to use (product-requirements.md §8.10, architecture.md
 * §6, progress.md D98–D99). The key goes into the vault and never comes back out: the only
 * way to use it is `withAiProvider`, which makes a provider from it **inside**
 * `KeyVault.withApiKey`, per call, so no provider holding the key outlives the call
 * (implementation-plan.md §3.3, ADR 2) [R12]. Every call it makes is written to the cost
 * ledger (§8.6, D101).
 */

export type ApiKeyDeps = {
  readonly vault: KeyVault;
};

export type AiDeps = ApiKeyDeps & {
  readonly aiProvider: AiProviderFactory;
};

/** What a spending call needs besides the key: somewhere to record what it cost, and when. */
export type MeteredAiDeps = AiDeps & {
  readonly ledger: CostLedger;
  readonly clock: Clock;
};

export type SaveApiKeyRequest = {
  readonly key: string;
  /** `false` holds it for this tab only, never written to this device (§6.2). */
  readonly remember: boolean;
};

/** What the key screen shows: where the key is held, and its last four characters (§6.2). */
export type ApiKeyStatus = {
  readonly storage: ApiKeyStorage;
  readonly lastFour: string;
};

/** Nothing was entered, or only whitespace. */
export class EmptyApiKeyError extends Error {
  constructor() {
    super("An API key cannot be empty.");
    this.name = "EmptyApiKeyError";
  }
}

/** A call needs the key, and none is held. */
export class NoApiKeyError extends Error {
  constructor() {
    super("No API key is held.");
    this.name = "NoApiKeyError";
  }
}

/** Store a key as entered, less the whitespace a paste brings with it. */
export const saveApiKey = async (request: SaveApiKeyRequest, deps: ApiKeyDeps): Promise<void> => {
  const key = request.key.trim();
  if (key === "") throw new EmptyApiKeyError();
  await deps.vault.putApiKey(key, { remember: request.remember });
};

/** Forget the key, in either mode. The device secret stays: it is the sync identity (§9.3). */
export const removeApiKey = (deps: ApiKeyDeps): Promise<void> => deps.vault.clear();

/** Where the key is held and how it ends, or `null` when there is none. Never the key. */
export const apiKeyStatus = async (deps: ApiKeyDeps): Promise<ApiKeyStatus | null> => {
  const storage = await deps.vault.apiKeyStorage();
  if (storage === null) return null;
  const lastFour = await deps.vault.withApiKey((key) => Promise.resolve(key.slice(-4)));
  return { storage, lastFour };
};

/** The one caller of the factory: a provider made from the held key, inside the vault's callback. */
const withProvider = async <T>(deps: AiDeps, fn: (ai: AiProvider) => Promise<T>): Promise<T> => {
  if (!(await deps.vault.hasApiKey())) throw new NoApiKeyError();
  return deps.vault.withApiKey((key) => fn(deps.aiProvider(key)));
};

/** The methods that spend nothing, so the ledger never sees them. Every other method is metered. */
const UNMETERED: ReadonlySet<string> = new Set<keyof AiProvider>(["capabilities", "verifyKey", "lastUsage"]);

/**
 * The provider with every spending method metered: once a call settles, resolved or thrown,
 * its `lastUsage()` goes into the ledger under `feature`. A call that fails after billing
 * is still recorded, because OpenAI still bills it (D102). The wrap is generic, over the
 * provider's own methods, so a capability added to the port is metered without an edit here.
 *
 * `lastUsage` reads the provider's last call, so the methods a callback makes must be
 * **sequential**: two in flight at once would race for it.
 */
const metered = (ai: AiProvider, record: (usage: UsageRecord) => Promise<void>): AiProvider => {
  const wrapped: Record<string, unknown> = { ...ai };
  for (const [name, method] of Object.entries(ai) as [string, (...args: unknown[]) => Promise<unknown>][]) {
    if (UNMETERED.has(name)) continue;
    wrapped[name] = async (...args: unknown[]) => {
      try {
        return await method(...args);
      } finally {
        const usage = ai.lastUsage();
        if (usage !== null) await record(usage);
      }
    };
  }
  return wrapped as AiProvider;
};

/**
 * Run `fn` with a provider made from the held key, inside the vault's callback, with every
 * call it makes recorded in the cost ledger as `feature` (D101). This is the one path from
 * the key to a spending provider; every AI use case goes through it, so none can skip the
 * ledger.
 */
export const withAiProvider = <T>(
  deps: MeteredAiDeps,
  feature: AiFeature,
  fn: (ai: AiProvider) => Promise<T>,
): Promise<T> =>
  withProvider(deps, (ai) =>
    fn(
      metered(ai, (usage) =>
        deps.ledger.append({
          ts: deps.clock.now(),
          feature,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costUsd: usage.costUsd ?? null,
        }),
      ),
    ),
  );

/**
 * The key screen's one cheap call (§8.10). Resolves when the provider accepts the key;
 * otherwise rejects with the provider's own error, for the caller to put in plain words.
 * It spends nothing, so it is not a feature and the ledger never sees it.
 */
export const checkApiKey = (deps: AiDeps): Promise<void> => withProvider(deps, (ai) => ai.verifyKey());
