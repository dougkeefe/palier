import { describe, expect, it } from "vitest";

import type { ScheduleStore } from "../ports.stub.js";

export const scheduleStoreContract = (
  name: string,
  make: () => Promise<ScheduleStore>,
): void => {
  describe(`ScheduleStore contract: ${name}`, () => {
    it("returns an entry whose due date has passed", async () => {
      const store = await make();
      await store.put({
        itemId: "item-1",
        due: "2026-01-01T00:00:00.000Z",
        skill: "reading",
      });

      expect(await store.due("2026-01-02T00:00:00.000Z", 10)).toHaveLength(1);
    });

    it("does not return an entry that is not yet due", async () => {
      const store = await make();
      await store.put({
        itemId: "item-1",
        due: "2026-06-01T00:00:00.000Z",
        skill: "reading",
      });

      expect(await store.due("2026-01-01T00:00:00.000Z", 10)).toEqual([]);
    });

    it("returns an entry due at exactly now", async () => {
      const store = await make();
      const instant = "2026-01-01T00:00:00.000Z";
      await store.put({ itemId: "item-1", due: instant, skill: "reading" });

      expect(await store.due(instant, 10)).toHaveLength(1);
    });

    it("returns the soonest-due entries first", async () => {
      const store = await make();
      await store.put({
        itemId: "later",
        due: "2026-01-02T00:00:00.000Z",
        skill: "reading",
      });
      await store.put({
        itemId: "sooner",
        due: "2026-01-01T00:00:00.000Z",
        skill: "reading",
      });

      expect((await store.due("2026-02-01T00:00:00.000Z", 10)).map((e) => e.itemId))
        .toEqual(["sooner", "later"]);
    });

    it("honours the limit", async () => {
      const store = await make();
      await store.put({ itemId: "a", due: "2026-01-01T00:00:00.000Z", skill: "reading" });
      await store.put({ itemId: "b", due: "2026-01-01T00:00:00.000Z", skill: "reading" });

      expect(await store.due("2026-02-01T00:00:00.000Z", 1)).toHaveLength(1);
    });

    it("replaces an entry rather than duplicating it when the same item is rescheduled", async () => {
      const store = await make();
      await store.put({ itemId: "a", due: "2026-01-01T00:00:00.000Z", skill: "reading" });
      await store.put({ itemId: "a", due: "2026-01-05T00:00:00.000Z", skill: "reading" });

      const due = await store.due("2026-02-01T00:00:00.000Z", 10);
      expect(due).toHaveLength(1);
      expect(due[0]?.due).toBe("2026-01-05T00:00:00.000Z");
    });

    it.todo("survives a reopen");
  });
};
