import type { AiProvider } from "@palier/app";
import { OPTION_IDS } from "@palier/domain";
import type {
  ItemDraft,
  OptionId,
  PassageDraft,
  ReviewVerdict,
  UsageRecord,
  WritingAssessment,
} from "@palier/domain";

/**
 * A deterministic in-memory `AiProvider`, the substitutable double the contract
 * suite runs against (the same role `memoryKeyVault` plays for `KeyVault`). It
 * synthesises schema-valid drafts and an approving verdict — enough to prove the
 * port's shape, not to stand in for a model's judgement. The content factory
 * ships its own richer scripted provider (it may not import `@palier/testing`),
 * so this stays minimal on purpose.
 */
export const fakeAiProvider = (): AiProvider => {
  let usage: UsageRecord | null = null;
  const bill = (tokens: number): void => {
    usage = { model: "fake", inputTokens: tokens, outputTokens: tokens };
  };

  return {
    capabilities: () => ({ generatePassage: true, generateItems: true, reviewItem: true, assessWriting: true }),

    generatePassage: (req) => {
      bill(10);
      const drafts: readonly PassageDraft[] = Array.from({ length: req.count }, (_, i) => ({
        lang: req.lang,
        docType: req.docType,
        title: `Passage ${String(i + 1)}`,
        body: "Phrase une. Phrase deux. Phrase trois.",
        targetBand: req.targetBand,
        topic: req.topic,
      }));
      return Promise.resolve(drafts);
    },

    generateItems: (req) => {
      bill(10);
      const { promptSpec, topic, count } = req;
      const drafts: readonly ItemDraft[] = Array.from({ length: count }, (_, i) => ({
        type: promptSpec.itemType,
        stem: { en: `Question ${String(i + 1)}`, fr: `Question ${String(i + 1)}` },
        options: OPTION_IDS.map((id) => ({
          id,
          text: `option ${id}`,
          rationale: { en: "why this option", fr: "pourquoi cette option" },
        })),
        key: "a",
        explanation: { en: "the rule taught", fr: "la règle enseignée" },
        subSkill: promptSpec.subSkill,
        targetBand: promptSpec.targetBand,
        topic,
        ...(promptSpec.itemType === "cloze" ? { blankIndex: 0 } : {}),
      }));
      return Promise.resolve(drafts);
    },

    reviewItem: (req) => {
      bill(5);
      const chosenKey = req.options[0]?.id ?? "a";
      const optionCases = Object.fromEntries(
        req.options.map((o) => [o.id, `case for ${o.id}`]),
      ) as Record<OptionId, string>;
      const verdict: ReviewVerdict = {
        chosenKey,
        confidence: 0.95,
        defensibleDistractors: [],
        optionCases,
        registerFlag: { flagged: false },
        estimatedBand: req.targetBand,
      };
      return Promise.resolve(verdict);
    },

    // Every criterion at the target band, and the first word marked, so the offsets are
    // always inside the text (D105). A text with no word has no error to mark.
    assessWriting: (req) => {
      bill(20);
      const firstWord = /\S+/u.exec(req.text);
      const criterion = { band: req.targetBand, evidence: "evidence quoted from the text" };
      const assessment: WritingAssessment = {
        criteria: {
          register: criterion,
          structure: criterion,
          grammar: criterion,
          vocabulary: criterion,
          task: criterion,
        },
        errors:
          firstWord === null
            ? []
            : [
                {
                  start: firstWord.index,
                  end: firstWord.index + firstWord[0].length,
                  correction: firstWord[0],
                  rule: "the rule the correction applies",
                },
              ],
        modelAnswer: `${req.text.trim()} (model answer)`,
      };
      return Promise.resolve(assessment);
    },

    // Bills nothing, and so leaves no earlier call's usage behind (D102).
    verifyKey: () => {
      usage = null;
      return Promise.resolve();
    },

    lastUsage: () => usage,
  };
};
