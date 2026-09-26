import { describe, expect, it } from "vitest";

import type { TelemetryStore } from "@palier/app";
import type { TelemetryEvent } from "@palier/domain";
import { itemId } from "@palier/domain";

const anEvent = (id: string, over: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
  itemId: itemId(id),
  correct: true,
  responseMs: 12_000,
  bankVersion: 2,
  restBucket: 3,
  ...over,
});

/**
 * The device-local telemetry store (progress.md D92): the consent, and the queue of
 * events waiting for the network. The queue is first in, first out, and an entry leaves
 * it only when it is removed by id, so a batch that was taken but never delivered is
 * still there for the next flush.
 */
export const telemetryStoreContract = (name: string, make: () => Promise<TelemetryStore>): void => {
  describe(`TelemetryStore contract: ${name}`, () => {
    it("reads 'unasked' on a fresh device", async () => {
      const store = await make();

      expect(await store.consent()).toBe("unasked");
    });

    it("keeps the consent it was given, and the latest of two", async () => {
      const store = await make();
      await store.setConsent("on");
      expect(await store.consent()).toBe("on");
      await store.setConsent("off");
      expect(await store.consent()).toBe("off");
    });

    it("takes nothing from an empty queue", async () => {
      const store = await make();

      expect(await store.take(10)).toEqual([]);
    });

    it("takes the oldest events first, up to the limit, across enqueues", async () => {
      const store = await make();
      await store.enqueue([anEvent("a"), anEvent("b")]);
      await store.enqueue([anEvent("c", { correct: false, restBucket: 0 })]);

      expect((await store.take(2)).map((q) => q.event.itemId)).toEqual(["a", "b"]);
      expect((await store.take(10)).map((q) => q.event)).toEqual([anEvent("a"), anEvent("b"), anEvent("c", { correct: false, restBucket: 0 })]);
    });

    it("gives every queued event its own id", async () => {
      const store = await make();
      await store.enqueue([anEvent("a"), anEvent("a")]);
      await store.enqueue([anEvent("a")]);

      const ids = (await store.take(10)).map((q) => q.id);
      expect(new Set(ids).size).toBe(3);
    });

    it("leaves a taken event queued until it is removed", async () => {
      const store = await make();
      await store.enqueue([anEvent("a"), anEvent("b"), anEvent("c")]);
      const [first] = await store.take(1);

      expect(await store.take(10)).toHaveLength(3);
      await store.remove([first!.id]);
      expect((await store.take(10)).map((q) => q.event.itemId)).toEqual(["b", "c"]);
    });

    it("ignores an id it does not hold", async () => {
      const store = await make();
      await store.enqueue([anEvent("a")]);
      await store.remove([987_654]);

      expect(await store.take(10)).toHaveLength(1);
    });

    it("keeps the queue when the consent changes", async () => {
      const store = await make();
      await store.enqueue([anEvent("a")]);
      await store.setConsent("on");

      expect(await store.take(10)).toHaveLength(1);
    });

    it("forgets the queue and the consent on clear, back to 'unasked'", async () => {
      const store = await make();
      await store.setConsent("on");
      await store.enqueue([anEvent("a")]);
      await store.clear();

      expect(await store.consent()).toBe("unasked");
      expect(await store.take(10)).toEqual([]);
    });
  });
};
