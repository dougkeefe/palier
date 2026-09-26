import { describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/app";
import {
  checkErrorOffsets,
  itemDraftSchema,
  passageDraftSchema,
  reviewVerdictSchema,
  writingAssessmentSchema,
} from "@palier/domain";
import type { GenerateItemsRequest, ReviewRequest, WritingRequest } from "@palier/domain";

/**
 * The substitutability contract for an `AiProvider` (implementation-plan.md §6.2
 * tier 3). It asserts the shape guarantees every provider must honour — schema-
 * valid drafts and verdicts, options a provider never fabricates beyond what was
 * asked, a usage record after a call — not the *quality* of a model's output,
 * which no automated test can judge (that is the review gate's job). The real
 * openai adapter passes this against MSW-canned responses; the in-memory fake
 * passes it directly.
 */

const anItemsRequest = (count: number): GenerateItemsRequest => ({
  promptSpec: {
    itemType: "cloze",
    targetBand: "B",
    subSkill: "agreement",
    instructions: "draft a cloze item",
  },
  topic: "human-resources",
  lang: "fr",
  count,
});

const aReviewRequest = (): ReviewRequest => ({
  itemType: "cloze",
  stem: { en: "The ___ agree.", fr: "Les ___ s'accordent." },
  options: [
    { id: "a", text: "verbes" },
    { id: "b", text: "verbe" },
    { id: "c", text: "verber" },
    { id: "d", text: "verbez" },
  ],
  subSkill: "agreement",
  targetBand: "B",
  lang: "fr",
});

const aWritingRequest = (): WritingRequest => ({
  task: "Rédigez un court paragraphe pour informer votre équipe d'un changement.",
  wordTarget: 80,
  text: "Bonjour à tous, la réunion de lundi est reporter à mardi.",
  targetBand: "B",
  lang: "fr",
  feedbackLang: "en",
});

export const aiProviderContract = (name: string, make: () => Promise<AiProvider>): void => {
  describe(`AiProvider contract: ${name}`, () => {
    it("reports its capabilities as booleans", async () => {
      const caps = (await make()).capabilities();
      expect(typeof caps.generatePassage).toBe("boolean");
      expect(typeof caps.generateItems).toBe("boolean");
      expect(typeof caps.reviewItem).toBe("boolean");
      expect(typeof caps.assessWriting).toBe("boolean");
    });

    it("has no usage before any call", async () => {
      expect((await make()).lastUsage()).toBeNull();
    });

    it("drafts schema-valid passages, no more than requested", async () => {
      const provider = await make();
      const drafts = await provider.generatePassage({
        topic: "finance-and-budgets",
        docType: "memo",
        targetBand: "B",
        lang: "fr",
        count: 2,
      });
      expect(drafts.length).toBeGreaterThan(0);
      expect(drafts.length).toBeLessThanOrEqual(2);
      for (const draft of drafts) {
        expect(passageDraftSchema.safeParse(draft).success).toBe(true);
        expect(draft.lang).toBe("fr");
        expect(draft.targetBand).toBe("B");
      }
    });

    it("drafts schema-valid items of the requested type and sub-skill", async () => {
      const provider = await make();
      const drafts = await provider.generateItems(anItemsRequest(3));
      expect(drafts.length).toBeGreaterThan(0);
      expect(drafts.length).toBeLessThanOrEqual(3);
      for (const draft of drafts) {
        expect(itemDraftSchema.safeParse(draft).success).toBe(true);
        expect(draft.type).toBe("cloze");
        expect(draft.subSkill).toBe("agreement");
        const ids = draft.options.map((o) => o.id);
        expect(ids).toContain(draft.key);
      }
    });

    it("records usage after a generation call", async () => {
      const provider = await make();
      await provider.generateItems(anItemsRequest(1));
      const usage = provider.lastUsage();
      expect(usage).not.toBeNull();
      expect(usage?.inputTokens).toBeGreaterThanOrEqual(0);
    });

    it("verifies its key with one call that records no usage", async () => {
      const provider = await make();
      await expect(provider.verifyKey()).resolves.toBeUndefined();
      expect(provider.lastUsage()).toBeNull();
    });

    it("carries no usage over from an earlier call: a key check after a billed call reports none (D102)", async () => {
      const provider = await make();
      await provider.generateItems(anItemsRequest(1));
      await provider.verifyKey();
      expect(provider.lastUsage()).toBeNull();
    });

    it("assesses writing schema-valid, with every error inside the text and none overlapping (D105)", async () => {
      const provider = await make();
      const request = aWritingRequest();
      const assessment = await provider.assessWriting(request);
      expect(writingAssessmentSchema.safeParse(assessment).success).toBe(true);
      expect(checkErrorOffsets(request.text, assessment.errors)).toBeNull();
      expect(provider.lastUsage()).not.toBeNull();
    });

    it("returns a schema-valid verdict whose chosen key is one of the options", async () => {
      const provider = await make();
      const verdict = await provider.reviewItem(aReviewRequest());
      expect(reviewVerdictSchema.safeParse(verdict).success).toBe(true);
      expect(["a", "b", "c", "d"]).toContain(verdict.chosenKey);
    });
  });
};
