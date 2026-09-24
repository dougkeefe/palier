import { describe, expect, it } from "vitest";

import type { SettingsStore } from "@palier/app";

export const settingsStoreContract = (
  name: string,
  make: () => Promise<SettingsStore>,
): void => {
  describe(`SettingsStore contract: ${name}`, () => {
    it("returns null for a key that was never set", async () => {
      const store = await make();

      expect(await store.get("missing")).toBeNull();
    });

    it("returns what was set", async () => {
      const store = await make();
      await store.set("locale", "fr");

      expect(await store.get<string>("locale")).toBe("fr");
    });

    it("overwrites on a second set", async () => {
      const store = await make();
      await store.set("locale", "fr");
      await store.set("locale", "en");

      expect(await store.get<string>("locale")).toBe("en");
    });

    it("round-trips a structured value", async () => {
      const store = await make();
      await store.set("sync", { enabled: true, devices: 2 });

      expect(await store.get("sync")).toEqual({ enabled: true, devices: 2 });
    });

    it("returns every key with its latest value from all, in any order", async () => {
      const store = await make();
      await store.set("locale", "fr");
      await store.set("goal", { minutes: 20 });
      await store.set("locale", "en");

      const all = [...(await store.all())].sort((a, b) => a.key.localeCompare(b.key));
      expect(all).toEqual([
        { key: "goal", value: { minutes: 20 } },
        { key: "locale", value: "en" },
      ]);
    });

    it("holds nothing after clear", async () => {
      const store = await make();
      await store.set("locale", "fr");
      await store.clear();

      expect(await store.all()).toEqual([]);
      expect(await store.get("locale")).toBeNull();
    });

    it.todo("survives a reopen");
  });
};
