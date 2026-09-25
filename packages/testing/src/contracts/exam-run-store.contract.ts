import { describe, expect, it } from "vitest";

import type { ExamRunStore } from "@palier/app";
import { itemId, sessionId } from "@palier/domain";

import { anExamRun } from "../fixtures/builders.js";

export const examRunStoreContract = (
  name: string,
  make: () => Promise<ExamRunStore>,
): void => {
  describe(`ExamRunStore contract: ${name}`, () => {
    it("returns null from get for a run it has never stored", async () => {
      const store = await make();

      expect(await store.get(sessionId("never-seen"))).toBeNull();
    });

    it("returns a stored run from get, answers and flags intact", async () => {
      const store = await make();
      const run = anExamRun({
        id: sessionId("r-1"),
        answers: [
          { itemId: itemId("i-1"), response: "b", msToFirstSelect: 900, msToConfirm: 1400, changedAnswer: true },
        ],
        flagged: [itemId("i-2")],
        elapsedMs: 61_000,
      });
      await store.put(run);

      expect(await store.get(sessionId("r-1"))).toEqual(run);
    });

    it("replaces a run on a second put with the same id", async () => {
      const store = await make();
      await store.put(anExamRun({ id: sessionId("r-1"), elapsedMs: 1_000 }));
      await store.put(anExamRun({ id: sessionId("r-1"), elapsedMs: 5_000 }));

      expect((await store.get(sessionId("r-1")))?.elapsedMs).toBe(5_000);
      expect(await store.all()).toHaveLength(1);
    });

    it("returns null from unsubmitted on an empty store", async () => {
      const store = await make();

      expect(await store.unsubmitted()).toBeNull();
    });

    it("returns the most recently started unsubmitted run", async () => {
      const store = await make();
      await store.put(anExamRun({ id: sessionId("older"), startedAt: "2026-01-01T00:00:00.000Z" }));
      await store.put(anExamRun({ id: sessionId("newer"), startedAt: "2026-01-03T00:00:00.000Z" }));
      await store.put(anExamRun({ id: sessionId("middle"), startedAt: "2026-01-02T00:00:00.000Z" }));

      expect((await store.unsubmitted())?.id).toBe("newer");
    });

    it("never returns a submitted run from unsubmitted, however recent", async () => {
      const store = await make();
      await store.put(anExamRun({ id: sessionId("open"), startedAt: "2026-01-01T00:00:00.000Z" }));
      await store.put(
        anExamRun({
          id: sessionId("done"),
          startedAt: "2026-01-05T00:00:00.000Z",
          submittedAt: "2026-01-05T01:00:00.000Z",
        }),
      );

      expect((await store.unsubmitted())?.id).toBe("open");
    });

    it("returns null from unsubmitted when every run is submitted", async () => {
      const store = await make();
      await store.put(anExamRun({ id: sessionId("done"), submittedAt: "2026-01-01T01:00:00.000Z" }));

      expect(await store.unsubmitted()).toBeNull();
    });

    it("returns every run from all, submitted or not, in any order", async () => {
      const store = await make();
      await store.put(anExamRun({ id: sessionId("open") }));
      await store.put(anExamRun({ id: sessionId("done"), submittedAt: "2026-01-02T00:00:00.000Z" }));

      const all = await store.all();
      expect(all.map((r) => r.id).sort()).toEqual(["done", "open"]);
      expect(all.find((r) => r.id === "done")).toEqual(
        anExamRun({ id: sessionId("done"), submittedAt: "2026-01-02T00:00:00.000Z" }),
      );
    });

    it("holds nothing after clear", async () => {
      const store = await make();
      await store.put(anExamRun({ id: sessionId("r-1") }));
      await store.clear();

      expect(await store.all()).toEqual([]);
      expect(await store.get(sessionId("r-1"))).toBeNull();
      expect(await store.unsubmitted()).toBeNull();
    });
  });
};
