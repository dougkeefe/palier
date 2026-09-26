import { describe, expect, it } from "vitest";

import type { KeyVault } from "@palier/app";

export const keyVaultContract = (
  name: string,
  make: () => Promise<KeyVault>,
): void => {
  describe(`KeyVault contract: ${name}`, () => {
    it("reports no key before one is stored", async () => {
      const vault = await make();

      expect(await vault.hasApiKey()).toBe(false);
    });

    it("reports a key once one is stored", async () => {
      const vault = await make();
      await vault.putApiKey("sk-test");

      expect(await vault.hasApiKey()).toBe(true);
    });

    it("hands the key to the callback", async () => {
      const vault = await make();
      await vault.putApiKey("sk-test");

      expect(await vault.withApiKey((key) => Promise.resolve(key))).toBe("sk-test");
    });

    it("rejects rather than yielding when no key is stored", async () => {
      const vault = await make();

      await expect(vault.withApiKey(() => Promise.resolve("never"))).rejects.toThrow();
    });

    it("forgets the key after clear [R12]", async () => {
      const vault = await make();
      await vault.putApiKey("sk-test");
      await vault.clear();

      expect(await vault.hasApiKey()).toBe(false);
    });

    it("reports a remembered key as held on the device", async () => {
      const vault = await make();
      expect(await vault.apiKeyStorage()).toBeNull();
      await vault.putApiKey("sk-test");

      expect(await vault.apiKeyStorage()).toBe("device");
    });

    it("holds a key for this tab only when asked not to remember it [R12]", async () => {
      const vault = await make();
      await vault.putApiKey("sk-tab", { remember: false });

      expect(await vault.apiKeyStorage()).toBe("tab");
      expect(await vault.hasApiKey()).toBe(true);
      expect(await vault.withApiKey((key) => Promise.resolve(key))).toBe("sk-tab");
    });

    it("replaces a remembered key with a tab-only one, and back", async () => {
      const vault = await make();
      await vault.putApiKey("sk-device");
      await vault.putApiKey("sk-tab", { remember: false });
      expect(await vault.apiKeyStorage()).toBe("tab");
      expect(await vault.withApiKey((key) => Promise.resolve(key))).toBe("sk-tab");

      await vault.putApiKey("sk-device-again", { remember: true });
      expect(await vault.apiKeyStorage()).toBe("device");
      expect(await vault.withApiKey((key) => Promise.resolve(key))).toBe("sk-device-again");
    });

    it("forgets a tab-only key after clear [R12]", async () => {
      const vault = await make();
      await vault.putApiKey("sk-tab", { remember: false });
      await vault.clear();

      expect(await vault.hasApiKey()).toBe(false);
      expect(await vault.apiKeyStorage()).toBeNull();
      await expect(vault.withApiKey(() => Promise.resolve("never"))).rejects.toThrow();
    });

    it("returns a device secret", async () => {
      const vault = await make();

      expect(await vault.deviceSecret()).toMatch(/\S/);
    });

    /**
     * The key-leak test [R12]. Written with the real Dexie vault rather than
     * deferred to phase 4 (progress.md D50): the vault's storage half lands in
     * phase 2, so the discipline "write the key-leak test before the vault"
     * applies now. Implementation-agnostic here — no method other than the
     * callback may surface the plaintext; the Dexie adapter adds its own
     * assertion that what sits at rest is ciphertext, not the key.
     */
    it("never returns the key from any method other than the callback [R12]", async () => {
      const key = "sk-secret-value-12345";
      const vault = await make();
      await vault.putApiKey(key);

      // `hasApiKey` answers a boolean, never the key.
      const present = await vault.hasApiKey();
      expect(present).toBe(true);
      expect(present as unknown).not.toBe(key);

      // Where it is held is a word, never the key, in either mode.
      expect(await vault.apiKeyStorage()).toBe("device");
      await vault.putApiKey(key, { remember: false });
      expect(await vault.apiKeyStorage()).toBe("tab");

      // The device secret is unrelated to the key and must not leak it.
      const secret = await vault.deviceSecret();
      expect(secret).not.toBe(key);
      expect(secret).not.toContain(key);

      // The callback is the only path to the plaintext, and it still works.
      expect(await vault.withApiKey((k) => Promise.resolve(k))).toBe(key);
    });
  });
};
