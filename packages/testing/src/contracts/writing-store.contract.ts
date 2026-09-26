import { describe, expect, it } from "vitest";

import type { WritingStore, WritingSubmission } from "@palier/app";
import type { WritingAssessment } from "@palier/domain";

const criterion = { band: "B" as const, evidence: "Le ton convient à un courriel de service." };

const anAssessment = (): WritingAssessment => ({
  criteria: { register: criterion, structure: criterion, grammar: criterion, vocabulary: criterion, task: criterion },
  errors: [{ start: 26, end: 34, correction: "reportée", rule: "Accord du participe passé avec être" }],
  modelAnswer: "Bonjour à tous, la réunion est reportée à mardi.",
});

const aSubmission = (id: string, writtenAt: string, over: Partial<WritingSubmission> = {}): WritingSubmission => ({
  id,
  promptId: "wp-briefing-01",
  text: "Bonjour à tous, la réunion reporter à mardi.",
  writtenAt,
  assessment: null,
  ...over,
});

/**
 * The writing workshop's submissions (progress.md D106): a plain upsert by id, read back
 * whole, listed newest first. What goes in comes out exactly, the assessment's offsets and
 * the text's own whitespace included, because the offsets point into that text.
 */
export const writingStoreContract = (name: string, make: () => Promise<WritingStore>): void => {
  describe(`WritingStore contract: ${name}`, () => {
    it("holds nothing on a fresh device", async () => {
      const store = await make();

      expect(await store.all()).toEqual([]);
      expect(await store.get("absent")).toBeNull();
    });

    it("returns a submission exactly as it was put, with and without an assessment", async () => {
      const store = await make();
      const draft = aSubmission("a", "2026-09-26T10:00:00.000Z", { text: "  Deux espaces,\n\tpuis une tabulation.  " });
      const assessed = aSubmission("b", "2026-09-26T11:00:00.000Z", { assessment: anAssessment() });
      await store.put(draft);
      await store.put(assessed);

      expect(await store.get("a")).toEqual(draft);
      expect(await store.get("b")).toEqual(assessed);
    });

    it("replaces a submission put again under the same id", async () => {
      const store = await make();
      await store.put(aSubmission("a", "2026-09-26T10:00:00.000Z"));
      const assessed = aSubmission("a", "2026-09-26T10:00:00.000Z", { assessment: anAssessment() });
      await store.put(assessed);

      expect(await store.all()).toEqual([assessed]);
    });

    it("lists submissions newest first, whatever order they were put in", async () => {
      const store = await make();
      await store.put(aSubmission("mid", "2026-09-25T10:00:00.000Z"));
      await store.put(aSubmission("new", "2026-09-26T10:00:00.000Z"));
      await store.put(aSubmission("old", "2026-09-20T10:00:00.000Z"));

      expect((await store.all()).map((s) => s.id)).toEqual(["new", "mid", "old"]);
    });

    it("empties on clear", async () => {
      const store = await make();
      await store.put(aSubmission("a", "2026-09-26T10:00:00.000Z"));
      await store.clear();

      expect(await store.all()).toEqual([]);
      expect(await store.get("a")).toBeNull();
    });
  });
};
