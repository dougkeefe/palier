import { describe, expect, it } from "vitest";

import type { AiProvider } from "@palier/adapters/openai";
import { OPTION_IDS } from "@palier/domain";
import type { ItemDraft, Passage } from "@palier/domain";

import { draftItems } from "./draft.js";

const draft = (): ItemDraft => ({
  type: "cloze",
  stem: { fr: "administration coordination le chat va au parc", en: "en" },
  blankIndex: 0,
  options: OPTION_IDS.map((id) => ({ id, text: `opt ${id}`, rationale: { fr: "f", en: "e" } })),
  key: "a",
  explanation: { fr: "f", en: "e" },
  subSkill: "agreement",
  targetBand: "B",
  topic: "human-resources",
});

// A provider that drafts one item and reports no usage, to exercise the
// "model unknown" fallback in assembly.
const provider: AiProvider = {
  capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true }),
  generatePassage: () => Promise.resolve([]),
  generateItems: () => Promise.resolve([draft()]),
  reviewItem: () => Promise.reject(new Error("not used")),
  verifyKey: () => Promise.resolve(),
  lastUsage: () => null,
};

const passage = { id: "p1", title: "Note", body: "Corps.", targetBand: "B", topic: "human-resources" } as unknown as Passage;

const options = {
  now: "2026-09-21T00:00:00.000Z",
  lang: "fr" as const,
  model: "seed",
  promptVersion: "v1",
  readingSubSkills: ["main-idea" as const],
  writingPlan: [{ subSkill: "agreement" as const, type: "cloze" as const, targetBand: "B" as const, topic: "human-resources" as const }],
};

describe("draftItems", () => {
  it("drafts reading items against passages and standalone writing items", async () => {
    const { items, failedCalls } = await draftItems([passage], provider, options);
    const reading = items.filter((i) => i.skill === "reading");
    const writing = items.filter((i) => i.skill === "writing");
    expect(reading).toHaveLength(1);
    expect(reading[0]?.passageId).toBe("p1");
    expect(writing).toHaveLength(1);
    expect(writing[0]?.provenance.generator?.model).toBe("unknown");
    expect(failedCalls).toBe(0);
  });

  it("skips a draft call that throws, counting it, without aborting the batch", async () => {
    const flaky: AiProvider = {
      ...provider,
      generateItems: (req) =>
        req.passage ? Promise.reject(new Error("bad response")) : provider.generateItems(req),
    };
    const { items, failedCalls } = await draftItems([passage], flaky, options);
    // The reading (passage-bound) call fails; the writing call still succeeds.
    expect(items).toHaveLength(1);
    expect(items[0]?.skill).toBe("writing");
    expect(failedCalls).toBe(1);
  });
});
