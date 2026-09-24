import { describe, expect, it } from "vitest";

import type { SessionStore } from "@palier/app";
import { sessionId } from "@palier/domain";

import { aSession } from "../fixtures/builders.js";

export const sessionStoreContract = (
  name: string,
  make: () => Promise<SessionStore>,
): void => {
  describe(`SessionStore contract: ${name}`, () => {
    it("returns null from latest on an empty store", async () => {
      const store = await make();

      expect(await store.latest()).toBeNull();
    });

    it("returns a created session from latest", async () => {
      const store = await make();
      await store.create(aSession({ id: sessionId("s-1") }));

      expect(await store.latest()).toMatchObject({ id: "s-1", completedAt: null });
    });

    it("returns the most-recently-started of several sessions from latest", async () => {
      const store = await make();
      await store.create(
        aSession({ id: sessionId("older"), startedAt: "2026-01-01T00:00:00.000Z" }),
      );
      await store.create(
        aSession({ id: sessionId("newer"), startedAt: "2026-01-03T00:00:00.000Z" }),
      );
      await store.create(
        aSession({ id: sessionId("middle"), startedAt: "2026-01-02T00:00:00.000Z" }),
      );

      expect((await store.latest())?.id).toBe("newer");
    });

    it("marks a session complete and returns the closed record", async () => {
      const store = await make();
      await store.create(aSession({ id: sessionId("s-1") }));

      const completed = await store.complete(sessionId("s-1"), "2026-02-01T00:00:00.000Z");

      expect(completed).toMatchObject({ id: "s-1", completedAt: "2026-02-01T00:00:00.000Z" });
    });

    it("reflects the completion in latest", async () => {
      const store = await make();
      await store.create(aSession({ id: sessionId("s-1") }));
      await store.complete(sessionId("s-1"), "2026-02-01T00:00:00.000Z");

      expect((await store.latest())?.completedAt).toBe("2026-02-01T00:00:00.000Z");
    });

    it("returns null from complete for a session it has never stored", async () => {
      const store = await make();

      expect(await store.complete(sessionId("never-seen"), "2026-02-01T00:00:00.000Z")).toBeNull();
    });

    it("keeps the first completion instant when a session is completed twice", async () => {
      const store = await make();
      await store.create(aSession({ id: sessionId("s-1") }));
      await store.complete(sessionId("s-1"), "2026-02-01T00:00:00.000Z");

      const again = await store.complete(sessionId("s-1"), "2026-03-01T00:00:00.000Z");

      expect(again?.completedAt).toBe("2026-02-01T00:00:00.000Z");
    });

    it("returns every session from all, completed or not, in any order", async () => {
      const store = await make();
      await store.create(aSession({ id: sessionId("open") }));
      await store.create(aSession({ id: sessionId("done"), completedAt: "2026-01-02T00:00:00.000Z" }));

      const all = await store.all();
      expect(all.map((s) => s.id).sort()).toEqual(["done", "open"]);
      expect(all.find((s) => s.id === "done")).toEqual(
        aSession({ id: sessionId("done"), completedAt: "2026-01-02T00:00:00.000Z" }),
      );
    });

    it("holds nothing after clear, so latest is null again", async () => {
      const store = await make();
      await store.create(aSession({ id: sessionId("s-1") }));
      await store.clear();

      expect(await store.all()).toEqual([]);
      expect(await store.latest()).toBeNull();
    });

    it.todo("survives a reopen");
  });
};
