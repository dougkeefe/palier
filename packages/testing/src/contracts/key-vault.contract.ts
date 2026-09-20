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

    it("returns a device secret", async () => {
      const vault = await make();

      expect(await vault.deviceSecret()).toMatch(/\S/);
    });

    /**
     * The key-leak test proper is written before the real vault, in phase 4,
     * and is a phase 4 exit criterion [R12]. This is the placeholder that
     * records the obligation here, where the contract lives.
     */
    it.todo("never returns the key from any method other than the callback [R12]");
  });
};
