import type { AiProvider, AiProviderFactory, ApiKeyStorage, KeyVault } from "../ports/index.js";

/**
 * The user's OpenAI key, from entry to use (product-requirements.md §8.10, architecture.md
 * §6, progress.md D98–D99). The key goes into the vault and never comes back out: the only
 * way to use it is `withAiProvider`, which makes a provider from it **inside**
 * `KeyVault.withApiKey`, per call, so no provider holding the key outlives the call
 * (implementation-plan.md §3.3, ADR 2) [R12].
 */

export type ApiKeyDeps = {
  readonly vault: KeyVault;
};

export type AiDeps = ApiKeyDeps & {
  readonly aiProvider: AiProviderFactory;
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

/**
 * Run `fn` with a provider made from the held key, inside the vault's callback. This is the
 * one path from the key to a provider; every AI use case goes through it.
 */
export const withAiProvider = async <T>(deps: AiDeps, fn: (ai: AiProvider) => Promise<T>): Promise<T> => {
  if (!(await deps.vault.hasApiKey())) throw new NoApiKeyError();
  return deps.vault.withApiKey((key) => fn(deps.aiProvider(key)));
};

/**
 * The key screen's one cheap call (§8.10). Resolves when the provider accepts the key;
 * otherwise rejects with the provider's own error, for the caller to put in plain words.
 */
export const checkApiKey = (deps: AiDeps): Promise<void> => withAiProvider(deps, (ai) => ai.verifyKey());
