import { describe, expect, it } from "vitest";

import type { GeneratedItemStore, GeneratedSet } from "@palier/app";
import { itemId } from "@palier/domain";
import type { Item } from "@palier/domain";

import { anItem } from "../fixtures/builders.js";

const generated = (id: string, over: Partial<Item> = {}): Item =>
  anItem({
    id: itemId(id),
    skill: "writing",
    type: "error-id",
    subSkill: "agreement",
    provenance: { origin: "generated", generator: { model: "m-draft", promptVersion: "3", date: "2026-09-26T10:00:00.000Z" } },
    ...over,
  });

const aSet = (id: string, createdAt: string, items: readonly Item[], over: Partial<GeneratedSet> = {}): GeneratedSet => ({
  id,
  skill: "writing",
  createdAt,
  items,
  ...over,
});

/**
 * Runtime-generated sets (progress.md D110): kept whole, the newest per skill found again
 * with its items in the order they were put, and any one item found by id.
 */
export const generatedItemStoreContract = (name: string, make: () => Promise<GeneratedItemStore>): void => {
  describe(`GeneratedItemStore contract: ${name}`, () => {
    it("holds nothing on a fresh device", async () => {
      const store = await make();

      expect(await store.latestSet("writing")).toBeNull();
      expect(await store.item(itemId("gen-absent"))).toBeNull();
    });

    it("returns a set exactly as it was put, its items in their order", async () => {
      const store = await make();
      const set = aSet("s1", "2026-09-26T10:00:00.000Z", [generated("gen-3"), generated("gen-1"), generated("gen-2")]);
      await store.putSet(set);

      expect(await store.latestSet("writing")).toEqual(set);
    });

    it("finds the newest set for a skill, and none for another skill", async () => {
      const store = await make();
      await store.putSet(aSet("mid", "2026-09-25T10:00:00.000Z", [generated("gen-m")]));
      await store.putSet(aSet("new", "2026-09-26T10:00:00.000Z", [generated("gen-n")]));
      await store.putSet(aSet("old", "2026-09-20T10:00:00.000Z", [generated("gen-o")]));

      expect((await store.latestSet("writing"))?.id).toBe("new");
      expect(await store.latestSet("reading")).toBeNull();
    });

    it("breaks a tie on the instant by the set's id", async () => {
      const store = await make();
      await store.putSet(aSet("s-a", "2026-09-26T10:00:00.000Z", [generated("gen-a")]));
      await store.putSet(aSet("s-b", "2026-09-26T10:00:00.000Z", [generated("gen-b")]));

      expect((await store.latestSet("writing"))?.id).toBe("s-b");
    });

    it("keeps no set that has no items", async () => {
      const store = await make();
      await store.putSet(aSet("kept", "2026-09-25T10:00:00.000Z", [generated("gen-k")]));
      await store.putSet(aSet("empty", "2026-09-26T10:00:00.000Z", []));

      expect((await store.latestSet("writing"))?.id).toBe("kept");
    });

    it("finds any kept item by id, from an older set too", async () => {
      const store = await make();
      const older = generated("gen-older");
      await store.putSet(aSet("s1", "2026-09-25T10:00:00.000Z", [older]));
      await store.putSet(aSet("s2", "2026-09-26T10:00:00.000Z", [generated("gen-newer")]));

      expect(await store.item(itemId("gen-older"))).toEqual(older);
    });

    it("empties on clear", async () => {
      const store = await make();
      await store.putSet(aSet("s1", "2026-09-26T10:00:00.000Z", [generated("gen-1")]));
      await store.clear();

      expect(await store.latestSet("writing")).toBeNull();
      expect(await store.item(itemId("gen-1"))).toBeNull();
    });
  });
};
