import { describe, expect, it } from "vitest";

import type { AttemptStore } from "@palier/app";
import { attemptId, itemId } from "@palier/domain";

import { anAttempt } from "../fixtures/builders.js";

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
      await store.append(anAttempt({ id: attemptId("a"), ts: "2026-01-01T00:00:00.000Z" }));
      await store.append(anAttempt({ id: attemptId("b"), ts: "2026-01-02T00:00:00.000Z" }));

      expect((await store.recent("reading", 10)).map((a) => a.id)).toEqual(["a", "b"]);
    });

    it("orders recent by id, so an attempt synced in late sorts by when it was made", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("b"), ts: "2026-01-02T00:00:00.000Z" }));
      await store.append(anAttempt({ id: attemptId("a"), ts: "2026-01-01T00:00:00.000Z" }));

      expect((await store.recent("reading", 10)).map((a) => a.id)).toEqual(["a", "b"]);
    });

    it("keeps the highest ids when recent is capped, whatever order they arrived in", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("c") }));
      await store.append(anAttempt({ id: attemptId("a") }));
      await store.append(anAttempt({ id: attemptId("b") }));

      expect((await store.recent("reading", 2)).map((a) => a.id)).toEqual(["b", "c"]);
    });

    it("returns nothing from recent when asked for no attempts", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("a") }));

      expect(await store.recent("reading", 0)).toEqual([]);
    });

    it("is idempotent on duplicate ULIDs", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("a") }));
      await store.append(anAttempt({ id: attemptId("a") }));

      expect(await store.recent("reading", 10)).toHaveLength(1);
    });

    it("reports whether an append was new: true for a fresh id, false for a duplicate", async () => {
      const store = await make();

      expect(await store.append(anAttempt({ id: attemptId("a") }))).toBe(true);
      expect(await store.append(anAttempt({ id: attemptId("a") }))).toBe(false);
    });

    it("returns nothing for a timestamp in the future", async () => {
      const store = await make();
      await store.append(anAttempt({ ts: "2026-01-01T00:00:00.000Z" }));

      expect(await store.since("2099-01-01T00:00:00.000Z")).toEqual([]);
    });

    it("returns only attempts for the requested skill", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("r"), skill: "reading" }));
      await store.append(anAttempt({ id: attemptId("w"), skill: "writing" }));

      expect((await store.recent("writing", 10)).map((a) => a.id)).toEqual(["w"]);
    });

    it("returns only attempts for the requested item", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("one"), itemId: itemId("item-1") }));
      await store.append(anAttempt({ id: attemptId("two"), itemId: itemId("item-2") }));

      expect((await store.forItem(itemId("item-2"))).map((a) => a.id)).toEqual(["two"]);
    });

    it("returns an empty list rather than throwing when it holds nothing", async () => {
      const store = await make();

      expect(await store.recent("reading", 10)).toEqual([]);
    });

    it("returns every attempt from all, across skills and items, in any order", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("r"), skill: "reading" }));
      await store.append(anAttempt({ id: attemptId("w"), skill: "writing" }));
      await store.append(anAttempt({ id: attemptId("w") }));

      expect((await store.all()).map((a) => a.id).sort()).toEqual(["r", "w"]);
    });

    it("holds nothing after clear, and accepts a previously seen id again", async () => {
      const store = await make();
      await store.append(anAttempt({ id: attemptId("a") }));
      await store.clear();

      expect(await store.all()).toEqual([]);
      expect(await store.recent("reading", 10)).toEqual([]);
      // Clear forgets ids too, so an import after a wipe restores every attempt.
      expect(await store.append(anAttempt({ id: attemptId("a") }))).toBe(true);
    });

    // Meaningless against an in-memory store; the Dexie adapter must satisfy it.
    it.todo("survives a reopen");
  });
};
