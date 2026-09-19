import { describe, expect, it } from "vitest";

import type { Attempt, AttemptStore } from "../ports.stub.js";

const anAttempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: "01HZZZZZZZZZZZZZZZZZZZZZZ1",
  itemId: "item-1",
  skill: "reading",
  ts: "2026-01-01T00:00:00.000Z",
  ...over,
});

/**
 * The shared contract every `AttemptStore` must satisfy, exported as a function
 * so the in-memory implementation and the Dexie adapter are held to the same
 * bar (implementation-plan.md 6.2, tier 3). That is the whole return on the
 * ports layer: "the ports layer only pays for itself if the contract tests are
 * actually maintained" (ADR 10).
 */
export const attemptStoreContract = (
  name: string,
  make: () => Promise<AttemptStore>,
): void => {
  describe(`AttemptStore contract: ${name}`, () => {
    it("returns appended attempts in insertion order", async () => {
      const store = await make();
      await store.append(anAttempt({ id: "a", ts: "2026-01-01T00:00:00.000Z" }));
      await store.append(anAttempt({ id: "b", ts: "2026-01-02T00:00:00.000Z" }));

      expect((await store.recent("reading", 10)).map((a) => a.id)).toEqual([
        "a",
        "b",
      ]);
    });

    it("is idempotent on duplicate ULIDs", async () => {
      const store = await make();
      await store.append(anAttempt({ id: "a" }));
      await store.append(anAttempt({ id: "a" }));

      expect(await store.recent("reading", 10)).toHaveLength(1);
    });

    it("returns nothing for a timestamp in the future", async () => {
      const store = await make();
      await store.append(anAttempt({ ts: "2026-01-01T00:00:00.000Z" }));

      expect(await store.since("2099-01-01T00:00:00.000Z")).toEqual([]);
    });

    it("returns only attempts for the requested skill", async () => {
      const store = await make();
      await store.append(anAttempt({ id: "r", skill: "reading" }));
      await store.append(anAttempt({ id: "w", skill: "writing" }));

      expect((await store.recent("writing", 10)).map((a) => a.id)).toEqual(["w"]);
    });

    it("returns only attempts for the requested item", async () => {
      const store = await make();
      await store.append(anAttempt({ id: "one", itemId: "item-1" }));
      await store.append(anAttempt({ id: "two", itemId: "item-2" }));

      expect((await store.forItem("item-2")).map((a) => a.id)).toEqual(["two"]);
    });

    it("returns an empty list rather than throwing when it holds nothing", async () => {
      const store = await make();

      expect(await store.recent("reading", 10)).toEqual([]);
    });

    // Meaningless against an in-memory store; the Dexie adapter must satisfy it.
    it.todo("survives a reopen");
  });
};
