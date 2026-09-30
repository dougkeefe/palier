import { describe, expect, it } from "vitest";

import type { RealtimeSecretSource } from "@palier/app";

/**
 * The two keys a harness is handed: one its provider accepts and one it refuses as invalid.
 * An implementation's harness makes its far end refuse `refused`, as OpenAI would a revoked key.
 */
export const CONTRACT_REALTIME_KEYS = {
  accepted: "sk-contract-realtime-accepted-5c1e",
  refused: "sk-contract-realtime-refused-9b04",
} as const;

/**
 * Where a realtime secret comes from (progress.md D165, D169): the browser's route client, the
 * server's OpenAI client and the memory fake all mint the same way. A secret is never the key and
 * never holds it, it says when it expires, and each mint is a new one. A refused key is refused by
 * name, `InvalidApiKeyError`, with the key nowhere in the error, so the screen can say why in words
 * and nothing can log it.
 */
export const realtimeSecretSourceContract = (name: string, make: () => Promise<RealtimeSecretSource>): void => {
  describe(`RealtimeSecretSource contract: ${name}`, () => {
    it("mints a secret that is not the key and does not hold it", async () => {
      const source = await make();
      const secret = await source.mint(CONTRACT_REALTIME_KEYS.accepted);

      expect(secret.value).not.toBe("");
      expect(secret.value).not.toContain(CONTRACT_REALTIME_KEYS.accepted);
      expect(JSON.stringify(secret)).not.toContain(CONTRACT_REALTIME_KEYS.accepted);
    });

    it("says when the secret expires, as an instant", async () => {
      const source = await make();
      const { expiresAt } = await source.mint(CONTRACT_REALTIME_KEYS.accepted);

      expect(new Date(expiresAt).toISOString()).toBe(expiresAt);
    });

    it("mints a new secret each time, so a reconnect never reuses one", async () => {
      const source = await make();
      const first = await source.mint(CONTRACT_REALTIME_KEYS.accepted);
      const second = await source.mint(CONTRACT_REALTIME_KEYS.accepted);

      expect(second.value).not.toBe(first.value);
    });

    it("refuses a key its provider refuses, by name, with the key nowhere in the error", async () => {
      const source = await make();
      const refusal = await source.mint(CONTRACT_REALTIME_KEYS.refused).then(
        () => null,
        (error: unknown) => error,
      );

      expect(refusal).toMatchObject({ name: "InvalidApiKeyError" });
      expect(String((refusal as Error).message)).not.toContain(CONTRACT_REALTIME_KEYS.refused);
      expect(JSON.stringify(refusal)).not.toContain(CONTRACT_REALTIME_KEYS.refused);
    });
  });
};
