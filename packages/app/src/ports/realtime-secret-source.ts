import type { ISO } from "./time.js";

/**
 * A short-lived browser credential for one realtime voice session (ADR 3, architecture.md
 * §6.3, progress.md D165, D169): the `ek_` value OpenAI minted and when it stops working.
 * It opens a connection and nothing else, so it may be held by the page; the key may not.
 */
export type RealtimeSecret = {
  readonly value: string;
  readonly expiresAt: ISO;
};

/**
 * Where a realtime secret comes from (D165), a port §3.3 did not name. `mint` spends the key
 * once, for the secret, and never returns or keeps it. Two edges implement it: the browser's,
 * which posts the key to the one server route ADR 3 allows, `POST /api/realtime/secret`, and the
 * server's, which that route runs, calling OpenAI. Slice 3's self-hosted escape is a third.
 * The app calls it only inside `KeyVault.withApiKey`. It rejects with the adapter's own named
 * errors, as `AiProvider` does, so the screen maps a refusal by its name.
 */
export type RealtimeSecretSource = {
  mint: (apiKey: string) => Promise<RealtimeSecret>;
};
