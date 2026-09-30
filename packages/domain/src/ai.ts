import type { ItemOption } from "./item.js";
import type { Localised, LocalisedRich } from "./localised.js";
import type { Band, TargetBand } from "./bands.js";
import type { OralPhase, OralSessionType } from "./oral-scenario.js";
import type { OralDirection, OralRegister, OralSpeaker, OralTurn } from "./oral-session.js";
import type { DocType } from "./passage.js";
import type { ItemType, Lang, OptionId } from "./skills.js";
import type { ReadingSubSkill, SubSkill, WritingSubSkill } from "./sub-skills.js";
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
 * feedback (progress.md D105), Phase 5 Slice 1 the factory's oral scenarios (D114),
 * Slice 2 the turn loop's transcription, voice and examiner (D117), and Slice 3 the
 * oral assessment (D122), each landing with its consumer, the same "the minimum the
 * consumer needs" discipline the ports layer already uses (progress.md D45).
 */

/** Which of the `AiProvider` methods a concrete provider supports. */
export type AiCapabilities = {
  readonly generatePassage: boolean;
  readonly generateItems: boolean;
  readonly reviewItem: boolean;
  readonly assessWriting: boolean;
  readonly generateScenario: boolean;
  readonly transcribe: boolean;
  readonly speak: boolean;
  readonly examinerTurn: boolean;
  readonly assessOral: boolean;
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

/**
 * One answer to transcribe (progress.md D117): the candidate's clip, the language it
 * is spoken in, and how long it is. `durationMs` is measured by the recorder, and it
 * is what prices a per-minute model when the response reports no usage of its own.
 * A `Blob` is a platform type, not a vendor's (D115).
 */
export type TranscribeRequest = {
  readonly audio: Blob;
  readonly lang: Lang;
  readonly durationMs: number;
};

/** What a transcription returns: the words, which may be none for a silent clip. */
export type Transcript = {
  readonly text: string;
};

/** The examiner's words to voice (D117), in the language being practised. */
export type SpeechRequest = {
  readonly text: string;
  readonly lang: Lang;
};

/**
 * What the examiner's next turn is written from in practice mode (architecture.md
 * §8.5, "transcript plus history goes to the text model"; D117): the scenario's
 * current phase, which of its question lists the client wants (`register`), and the
 * conversation so far. The client drives the phases (§8.5 step 5).
 */
export type ExaminerTurnRequest = {
  readonly sessionType: OralSessionType;
  readonly targetBand: "B" | "C";
  readonly lang: Lang;
  readonly topic: Topic;
  readonly phase: OralPhase;
  readonly register: OralRegister;
  readonly transcript: readonly { readonly speaker: OralSpeaker; readonly text: string }[];
};

/**
 * The examiner's next short question, and whether the candidate's last answer showed
 * them coping or struggling (§8.5's `flag_difficulty`), so the client can adapt.
 */
export type ExaminerTurn = {
  readonly text: string;
  readonly difficulty: OralDirection | null;
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
 * The five criteria a spoken session is reported by (product-requirements.md §8.6),
 * in the order the report shows them. Pronunciation is the sixth, and is not among
 * them: it cannot be judged from a transcript (architecture.md §8.5), so it is "not
 * assessed" unless the user opts to upload the recording (Gate J, progress.md D122).
 */
export const ORAL_CRITERIA = ["comprehension", "fluency", "grammar", "vocabulary", "task"] as const;
export type OralCriterion = (typeof ORAL_CRITERIA)[number];

/**
 * How much an observation the examiner noted during a studio session weighs (progress.md
 * D168). The examiner's `note_observation` tool takes one of these, and `assessOral` quotes
 * the notes as observations, never as verdicts.
 */
export const ORAL_NOTE_SEVERITIES = ["minor", "moderate", "major"] as const;
export type OralNoteSeverity = (typeof ORAL_NOTE_SEVERITIES)[number];

/**
 * One observation the realtime examiner noted during a studio session (architecture.md §8.5
 * step 6, D165, D168): the criterion it bears on, what the candidate said or did, and how much
 * it weighs. `phase` is stamped by the client, as a turn's is. Notes never surface during the
 * session; the report reads them.
 */
export type OralNote = {
  readonly criterion: OralCriterion;
  readonly evidence: string;
  readonly severity: OralNoteSeverity;
  readonly phase: number;
};

/**
 * A sub-skill the bank has items for, so a fix can be drilled and can bias the plan
 * (progress.md D122). The bank has no oral items, so an oral sub-skill would reach
 * nothing: an oral fix names the oral criterion it hurt and a reading or writing
 * sub-skill that practises it.
 */
export type ScoredSubSkill = ReadingSubSkill | WritingSubSkill;

/**
 * What `assessOral` is sent (architecture.md §8.5, "post-session scoring"): the whole
 * session, the scenario it followed, and the published level descriptors, quoted in
 * the prompt, in `feedbackLang`. The use case takes the descriptors from the profile,
 * so the adapter never reads content (ADR 9). `lang` is the language spoken, and
 * `feedbackLang` the interface language, as `WritingRequest`'s are.
 */
export type OralRequest = {
  readonly sessionType: OralSessionType;
  readonly targetBand: "B" | "C";
  readonly lang: Lang;
  readonly feedbackLang: Lang;
  readonly topic: Topic;
  readonly phases: readonly { readonly name: string; readonly intent: string }[];
  readonly turns: readonly OralTurn[];
  readonly descriptors: Readonly<Record<"A" | "B" | "C", string>>;
  /** A studio session's examiner notes (D168), quoted by the prompt when present; practice mode has none. */
  readonly notes?: readonly OralNote[] | undefined;
};

/**
 * One of up to three highest-leverage fixes, most costly first (§8.6; fewer from a short session,
 * progress.md D127): the criterion
 * it cost, the sub-skill that drills it, what to do, and the evidence for it.
 */
export type OralFix = {
  readonly criterion: OralCriterion;
  readonly subSkill: ScoredSubSkill;
  readonly advice: string;
  readonly evidence: string;
};

/**
 * A word the candidate lacked (§8.6, "your five most useful missing words"): the
 * word, the candidate's own words where it would have served, found in `turn`, and
 * that sentence said again with it.
 */
export type MissingWord = {
  readonly word: string;
  readonly turn: number;
  readonly excerpt: string;
  readonly example: string;
};

/**
 * One error in a candidate's turn, as `[start, end)` offsets into that turn's text,
 * so the transcript is marked up over what they said. `turn` indexes the session's
 * turns and names a candidate's.
 */
export type OralTurnError = {
  readonly turn: number;
  readonly start: number;
  readonly end: number;
  readonly correction: string;
  readonly rule: string;
};

/** What `assessOral` returns, placed and checked (progress.md D122). */
export type OralAssessment = {
  readonly criteria: Readonly<Record<OralCriterion, CriterionAssessment>>;
  readonly fixes: readonly OralFix[];
  readonly missingWords: readonly MissingWord[];
  readonly errors: readonly OralTurnError[];
};

/** One error as a model reports it: the turn and the exact words, never offsets (D105). */
export type OralTurnErrorDraft = {
  readonly turn: number;
  readonly excerpt: string;
  readonly correction: string;
  readonly rule: string;
};

/** The model's output, before its errors are placed in their turns. */
export type OralAssessmentDraft = {
  readonly criteria: Readonly<Record<OralCriterion, CriterionAssessment>>;
  readonly fixes: readonly OralFix[];
  readonly missingWords: readonly MissingWord[];
  readonly errors: readonly OralTurnErrorDraft[];
};

/**
 * Token (and, priced, dollar) usage from the last call, for the cost ledger
 * (architecture.md §8.6). `costUsd` is absent until a `pricing.json` prices it.
 * An audio call reports what it is billed by instead (D117): the seconds of audio
 * it transcribed, or the characters it voiced, with its token counts zero unless the
 * response gave some.
 */
export type UsageRecord = {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly audioSeconds?: number | undefined;
  readonly characters?: number | undefined;
  readonly costUsd?: number | undefined;
};

/**
 * The features that spend the user's key, the names the cost ledger records a
 * call under (architecture.md §8.6, progress.md D101). Writing feedback is Phase 4
 * Slice 3, item generation Slice 4, and oral practice Phase 5 Slice 2 (D117): a
 * session's examiner turns, voice and transcriptions. The report on a session is
 * Slice 3's `oral-assessment` (D122), apart from the session, so each is shown at
 * its own cost. A key check spends nothing, so it is not a feature. Studio mode's
 * realtime conversation is `oral-studio` (Phase 6 Slice 1, D165): its audio in and
 * out, and the candidate's speech transcribed, each row stamped with its session.
 */
export const AI_FEATURES = ["writing-feedback", "item-generation", "oral-practice", "oral-assessment", "oral-studio"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/**
 * A model's price from `pricing.json` (§8.6), in the unit OpenAI bills it by
 * (progress.md D117): USD per million tokens in and out, per minute of audio, or per
 * million characters voiced. Only a unit the device can measure is priced, so the
 * meter matches the bill (principle 8, Gate G).
 */
export type TokenPrice = {
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
};
export type MinutePrice = { readonly perMinute: number };
export type CharacterPrice = { readonly perMChars: number };
/**
 * A realtime model's price (Phase 6 Slice 1, D167): text and audio are billed at their own
 * rates, in and out, and input the model has already read is billed at the cached rate.
 * OpenAI lists one cached rate for text and audio alike, so it is one field here; the day
 * they differ, it becomes two.
 */
export type RealtimePrice = {
  readonly textInputPerMTok: number;
  readonly textOutputPerMTok: number;
  readonly audioInputPerMTok: number;
  readonly audioOutputPerMTok: number;
  readonly cachedInputPerMTok: number;
};
export type ModelPrice = TokenPrice | MinutePrice | CharacterPrice | RealtimePrice;

/**
 * A realtime call's tokens in the units it is priced by (D167). The input counts are the
 * UNCACHED part; `cachedInputTokens` is the rest, text and audio together.
 */
export type RealtimeTokens = {
  readonly textInputTokens: number;
  readonly textOutputTokens: number;
  readonly audioInputTokens: number;
  readonly audioOutputTokens: number;
  readonly cachedInputTokens: number;
};

/**
 * One typical call a feature makes, for the per-feature estimate (D103), in its
 * model's unit (D117). `role` names a model in the app's model configuration, so a
 * model change moves the estimate with it.
 */
export type FeatureCall =
  | { readonly role: string; readonly inputTokens: number; readonly outputTokens: number }
  | { readonly role: string; readonly minutes: number }
  | { readonly role: string; readonly characters: number }
  | ({ readonly role: string } & RealtimeTokens);
