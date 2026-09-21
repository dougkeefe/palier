import { describe, expect, it } from "vitest";

import type { ScheduleStore } from "@palier/app";
import { itemId } from "@palier/domain";

import { aScheduleEntry } from "../fixtures/builders.js";

export const scheduleStoreContract = (
  name: string,
  make: () => Promise<ScheduleStore>,
): void => {
  describe(`ScheduleStore contract: ${name}`, () => {
    it("returns an entry whose due date has passed", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("item-1"), due: "2026-01-01T00:00:00.000Z" }));

      expect(await store.due("2026-01-02T00:00:00.000Z", 10)).toHaveLength(1);
    });

    it("does not return an entry that is not yet due", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("item-1"), due: "2026-06-01T00:00:00.000Z" }));

      expect(await store.due("2026-01-01T00:00:00.000Z", 10)).toEqual([]);
    });

    it("returns an entry due at exactly now", async () => {
      const store = await make();
      const instant = "2026-01-01T00:00:00.000Z";
      await store.put(aScheduleEntry({ itemId: itemId("item-1"), due: instant }));

      expect(await store.due(instant, 10)).toHaveLength(1);
    });

    it("returns the soonest-due entries first", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("later"), due: "2026-01-02T00:00:00.000Z" }));
      await store.put(aScheduleEntry({ itemId: itemId("sooner"), due: "2026-01-01T00:00:00.000Z" }));

      expect((await store.due("2026-02-01T00:00:00.000Z", 10)).map((e) => e.itemId))
        .toEqual(["sooner", "later"]);
    });

    it("honours the limit", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("a"), due: "2026-01-01T00:00:00.000Z" }));
      await store.put(aScheduleEntry({ itemId: itemId("b"), due: "2026-01-01T00:00:00.000Z" }));

      expect(await store.due("2026-02-01T00:00:00.000Z", 1)).toHaveLength(1);
    });

    it("replaces an entry rather than duplicating it when the same item is rescheduled", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("a"), due: "2026-01-01T00:00:00.000Z" }));
      await store.put(aScheduleEntry({ itemId: itemId("a"), due: "2026-01-05T00:00:00.000Z" }));

      const due = await store.due("2026-02-01T00:00:00.000Z", 10);
      expect(due).toHaveLength(1);
      expect(due[0]?.due).toBe("2026-01-05T00:00:00.000Z");
    });

    it("returns null from get for an item it has never scheduled", async () => {
      const store = await make();

      expect(await store.get(itemId("never-seen"))).toBeNull();
    });

    it("returns the stored entry, box and all, from get", async () => {
      const store = await make();
      await store.put(
        aScheduleEntry({ itemId: itemId("a"), due: "2026-01-05T00:00:00.000Z", box: 3 }),
      );

      expect(await store.get(itemId("a"))).toMatchObject({
        itemId: "a",
        due: "2026-01-05T00:00:00.000Z",
        box: 3,
      });
    });

    it("keeps the box that was written, not the one it replaced", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("a"), box: 1 }));
      await store.put(aScheduleEntry({ itemId: itemId("a"), box: 2 }));

      expect((await store.get(itemId("a")))?.box).toBe(2);
    });

    /**
     * A retired item (architecture.md 7.3: box 5 "retired from the queue") is
     * stored with a null due date. It must never surface as due — and the real
     * store gets that for free, because 9.1 indexes on `due` and IndexedDB does
     * not index a null key path. It stays reachable by id so that answering it
     * again can resume from its box rather than from nothing.
     */
    it("never returns a retired entry from due, but still returns it from get", async () => {
      const store = await make();
      await store.put(aScheduleEntry({ itemId: itemId("retired"), due: null, box: 5 }));

      expect(await store.due("2099-01-01T00:00:00.000Z", 10)).toEqual([]);
      expect(await store.get(itemId("retired"))).toMatchObject({ due: null, box: 5 });
    });

    it.todo("survives a reopen");
  });
};
