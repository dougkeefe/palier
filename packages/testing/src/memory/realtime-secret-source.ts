import type { RealtimeSecretSource } from "@palier/app";

/** How long a memory secret lasts, as the route asks OpenAI for (D169). */
const SECRET_SECONDS = 60;

/** The error a refused key raises, named as the openai adapter's is, so a screen maps it the same way. */
class RefusedKeyError extends Error {
  override name = "InvalidApiKeyError";
}

export type MemoryRealtimeSecretSource = RealtimeSecretSource & {
  /** Every key it was handed, in order: a test proves the key reached only here. */
  readonly keys: () => readonly string[];
};

/**
 * A realtime secret source with no network (progress.md D169): the hermetic server's, behind
 * `POST /api/realtime/secret`, and the fake a test hands a studio transport. It mints
 * `ek_memory_<n>`, expiring a minute from `now`, and refuses any key in `refuses` as OpenAI
 * refuses a revoked one.
 */
export const memoryRealtimeSecretSource = (
  options: { readonly now?: () => string; readonly refuses?: readonly string[] } = {},
): MemoryRealtimeSecretSource => {
  const now = options.now ?? (() => new Date().toISOString());
  const keys: string[] = [];
  let minted = 0;
  return {
    mint: (apiKey) => {
      keys.push(apiKey);
      if (options.refuses?.includes(apiKey) === true) return Promise.reject(new RefusedKeyError("OpenAI refused the key."));
      minted += 1;
      const expiresAt = new Date(Date.parse(now()) + SECRET_SECONDS * 1000).toISOString();
      return Promise.resolve({ value: `ek_memory_${String(minted)}`, expiresAt });
    },
    keys: () => keys,
  };
};
