import type { ItemOption } from "./item.js";
import type { Localised, LocalisedRich } from "./localised.js";
import type { Band, TargetBand } from "./bands.js";
import type { OralPhase, OralSessionType } from "./oral-scenario.js";
import type { DocType } from "./passage.js";
import type { ItemType, Lang, OptionId } from "./skills.js";
import type { SubSkill } from "./sub-skills.js";
import type { Topic } from "./topics.js";
import type { PromptSpec } from "./item-types/definition.js";

/**
 * The AI boundary DTOs (ADR 20). They live in `@palier/domain` rather than
 * `@palier/app` so that `apps/factory` — which may reach `@palier/domain` and
 * the openai adapter, and nothing else — can build requests and read verdicts
 * without importing the port layer. The `AiProvider` port interface itself
 * still lives in `@palier/app` (implementation-plan.md §3.3); only these types
 * moved down, because they are Zod-schema'd content-adjacent data and that is
 * domain's job (architecture.md §8.2).
 *
 * Phase 1 defined what the content factory consumes; Phase 4 Slice 3 adds writing
 * feedback (progress.md D105), and Phase 5 Slice 1 the factory's oral scenarios
 * (D114). The oral assessment, transcription and voice requests and responses land
 * with their slices, the same "the minimum the consumer needs" discipline the
 * ports layer already uses (progress.md D45).
 */

/** Which of the `AiProvider` methods a concrete provider supports. */
export type AiCapabilities = {
  readonly generatePassage: boolean;
  readonly generateItems: boolean;
  readonly reviewItem: boolean;
  readonly assessWriting: boolean;
  readonly generateScenario: boolean;
};

/**
 * What a provider is asked to write a passage about. The source text is never
 * sent — topic, document type and register drive generation, and the sentences
 * are new (content-factory.md §4.2, R6: nothing is quoted).
 */
export type GeneratePassageRequest = {
  readonly topic: Topic;
  readonly docType: DocType;
  readonly targetBand: TargetBand;
  readonly lang: Lang;
  readonly count: number;
};

/**
 * The creative output of `generatePassage`. The factory assembles the full
 * `Passage` from it — computing `wordCount`/`readability`, minting the id, and
 * writing `source`/provenance — so the adapter stays a pure translator with no
 * id-minting or provenance policy of its own (adapters/CLAUDE.md: "no use case
 * logic"). This is the §3.3 amendment recorded in the D-log: `generatePassage`
 * is a Phase-1 addition and returns a draft, not a `Passage`.
 */
export type PassageDraft = {
  readonly lang: Lang;
  readonly docType: DocType;
  readonly title: string;
  readonly body: string;
  readonly targetBand: TargetBand;
  readonly topic: Topic;
};

/** The passage an item is written against, for the types that need one. */
export type PassageContext = {
  readonly title: string;
  readonly body: string;
};

/**
 * What a provider is asked to draft items for. `promptSpec` comes from the item
 * type registry's `generatePrompt` (implementation-plan.md §3.4), so adding an
 * item type extends the factory without editing it.
 */
export type GenerateItemsRequest = {
  readonly promptSpec: PromptSpec;
  readonly passage?: PassageContext | undefined;
  readonly topic: Topic;
  readonly lang: Lang;
  readonly count: number;
};

/**
 * The creative output of `generateItems`. As with `PassageDraft`, the factory
 * assembles the full `Item` (id, provenance, status, timestamps) from this, so
 * the port returns a draft rather than the §3.3 `Item[]` (D-log amendment). The
 * options reuse `ItemOption` — id, text and both-locale rationale [R7].
 */
export type ItemDraft = {
  readonly type: ItemType;
  readonly stem: LocalisedRich;
  readonly blankIndex?: number | undefined;
  readonly options: readonly ItemOption[];
  readonly key: OptionId;
  readonly explanation: Localised;
  readonly subSkill: SubSkill;
  readonly targetBand: TargetBand;
  readonly topic: Topic;
};

/**
 * What a provider is asked to plan an oral scenario for (progress.md D114): the
 * session type and its length from the factory's configuration, and the band and
 * topic. The phases' minutes must add up to `minutes`, which the factory checks.
 */
export type GenerateScenarioRequest = {
  readonly sessionType: OralSessionType;
  readonly targetBand: "B" | "C";
  readonly lang: Lang;
  readonly topic: Topic;
  readonly minutes: number;
};

/**
 * The creative output of `generateScenario`: the phase plan only. The factory
 * assembles the `OralScenario` around it, minting the id and copying the type,
 * band, language and topic it asked for, as it does for passages and items.
 */
export type ScenarioDraft = {
  readonly phases: readonly OralPhase[];
};

/** One option as the reviewer sees it: id and text only — no rationale, no key. */
export type ReviewOption = {
  readonly id: OptionId;
  readonly text: string;
};

/**
 * An item handed to the adversarial reviewer **blind to its key**
 * (content-factory.md §4.4). No `key`, no rationales, no explanation — the
 * reviewer must not be able to rationalise toward the intended answer.
 */
export type ReviewRequest = {
  readonly itemType: ItemType;
  readonly stem: LocalisedRich;
  readonly options: readonly ReviewOption[];
  readonly passage?: PassageContext | undefined;
  readonly subSkill: SubSkill;
  readonly targetBand: TargetBand;
  readonly lang: Lang;
};

/**
 * The reviewer's four judgements (content-factory.md §4.4). The factory turns
 * this into a pass/discard decision deterministically: the reviewer must pick
 * the intended key with high confidence, name no defensible distractor, raise
 * no register flag, and land within one band of the tag.
 */
export type ReviewVerdict = {
  /** The option the reviewer believes is correct, answering blind. */
  readonly chosenKey: OptionId;
  /** 0..1. The gate requires this at or above the factory's threshold. */
  readonly confidence: number;
  /** Options (other than `chosenKey`) the reviewer finds defensibly correct. */
  readonly defensibleDistractors: readonly OptionId[];
  /** The strongest case argued for each option, kept for the record. */
  readonly optionCases: Readonly<Record<OptionId, string>>;
  /** Whether the French reads as translated, France-specific or textbook. */
  readonly registerFlag: { readonly flagged: boolean; readonly note?: string | undefined };
  /** The band the reviewer thinks the item actually tests. */
  readonly estimatedBand: TargetBand;
};

/**
 * The five criteria writing feedback is structured by (product-requirements.md
 * §8.7, architecture.md §8.4), in the order the feedback shows them.
 */
export const WRITING_CRITERIA = [
  "register",
  "structure",
  "grammar",
  "vocabulary",
  "task",
] as const;
export type WritingCriterion = (typeof WRITING_CRITERIA)[number];

/**
 * What `assessWriting` is sent (architecture.md §8.4): the prompt, the user's own
 * text and the band they are aiming at. `lang` is the language the text is
 * written in; `feedbackLang` is the interface language, so the evidence and the
 * rules read in the language the user reads the app in.
 */
export type WritingRequest = {
  readonly task: string;
  readonly wordTarget: number;
  readonly text: string;
  readonly targetBand: TargetBand;
  readonly lang: Lang;
  readonly feedbackLang: Lang;
};

/** One criterion's judgement: a band and the evidence for it. */
export type CriterionAssessment = {
  readonly band: Band;
  readonly evidence: string;
};

/**
 * One error in the user's own text, as `[start, end)` offsets into it (UTF-16
 * code units, JavaScript string indices), so the feedback is drawn inline over
 * what they wrote (architecture.md §8.4). `checkErrorOffsets` holds the ranges
 * inside the text and apart from each other.
 */
export type WritingError = {
  readonly start: number;
  readonly end: number;
  readonly correction: string;
  readonly rule: string;
};

/** What `assessWriting` returns, placed and checked (progress.md D105). */
export type WritingAssessment = {
  readonly criteria: Readonly<Record<WritingCriterion, CriterionAssessment>>;
  readonly errors: readonly WritingError[];
  readonly modelAnswer: string;
};

/**
 * One error as a model reports it: the exact words, not offsets. Language models
 * count characters badly, so the adapter asks for the excerpt and `placeErrors`
 * finds it in the text, which turns a miscount into a malformed answer that is
 * retried rather than a correction drawn over the wrong words (progress.md D105).
 */
export type WritingErrorDraft = {
  readonly excerpt: string;
  readonly correction: string;
  readonly rule: string;
};

/** The model's creative output, before its errors are placed. */
export type WritingFeedbackDraft = {
  readonly criteria: Readonly<Record<WritingCriterion, CriterionAssessment>>;
  readonly errors: readonly WritingErrorDraft[];
  readonly modelAnswer: string;
};

/**
 * Token (and, priced, dollar) usage from the last call, for the cost ledger
 * (architecture.md §8.6). `costUsd` is absent until a `pricing.json` prices it.
 */
export type UsageRecord = {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd?: number | undefined;
};

/**
 * The features that spend the user's key, the names the cost ledger records a
 * call under (architecture.md §8.6, progress.md D101). Writing feedback is Phase 4
 * Slice 3 and item generation Slice 4; the oral features join with Phase 5. A key
 * check spends nothing, so it is not a feature.
 */
export const AI_FEATURES = ["writing-feedback", "item-generation"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/** A model's price in USD per million tokens, from `pricing.json` (§8.6). */
export type ModelPrice = {
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
};

/**
 * One typical call a feature makes, for the per-feature estimate (D103). `role`
 * names a model in the app's model configuration, so a model change moves the
 * estimate with it.
 */
export type FeatureCall = {
  readonly role: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
};
