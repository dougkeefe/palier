export type { Brand } from "./brand.js";

export type {
  AttemptId,
  DeviceId,
  FormId,
  ItemId,
  PassageId,
  ScenarioId,
  SessionId,
} from "./ids.js";
export {
  attemptId,
  deviceId,
  formId,
  itemId,
  passageId,
  scenarioId,
  sessionId,
} from "./ids.js";

export type { Localised, LocalisedRich } from "./localised.js";

export type { Band, TargetBand } from "./bands.js";
export { BAND_RANK, BANDS, TARGET_BANDS, bandRank, compareBands, isBand } from "./bands.js";

export type {
  ContentStatus,
  ExamMode,
  ItemType,
  Lang,
  OptionId,
  ScoredSkill,
  Skill,
} from "./skills.js";
export {
  CONTENT_STATUSES,
  EXAM_MODES,
  ITEM_TYPES,
  LANGS,
  OPTION_IDS,
  SCORED_SKILLS,
  SKILLS,
} from "./skills.js";

export type { Topic } from "./topics.js";
export { TOPICS } from "./topics.js";

export type {
  OralSubSkill,
  ReadingSubSkill,
  SubSkill,
  WritingSubSkill,
} from "./sub-skills.js";
export {
  ALL_SUB_SKILLS,
  ORAL_SUB_SKILLS,
  READING_SUB_SKILLS,
  SUB_SKILLS_BY_SKILL,
  WRITING_SUB_SKILLS,
  subSkillsFor,
} from "./sub-skills.js";

export type { Item, ItemOption, ItemProvenance, ItemStats } from "./item.js";
export type {
  DocType,
  Licence,
  Passage,
  PassageSource,
  Readability,
} from "./passage.js";
export { DOC_TYPES, LICENCES } from "./passage.js";
export type { OralPhase, OralScenario, OralSessionType } from "./oral-scenario.js";
export { ORAL_SESSION_TYPES } from "./oral-scenario.js";
export type { BandCut, ExamForm } from "./exam-form.js";
export type { Attempt, AttemptMode } from "./attempt.js";
export { ATTEMPT_MODES } from "./attempt.js";

// The AI boundary DTOs (ADR 20). Types live here so `apps/factory` can build
// requests and read verdicts without importing `@palier/app`; the `AiProvider`
// port interface stays in `@palier/app` (§3.3).
export type {
  AiCapabilities,
  AiFeature,
  CharacterPrice,
  CriterionAssessment,
  ExaminerTurn,
  ExaminerTurnRequest,
  FeatureCall,
  GenerateItemsRequest,
  GeneratePassageRequest,
  GenerateScenarioRequest,
  ItemDraft,
  MinutePrice,
  MissingWord,
  OralAssessment,
  OralAssessmentDraft,
  OralCriterion,
  OralFix,
  OralRequest,
  OralTurnError,
  OralTurnErrorDraft,
  ModelPrice,
  PassageContext,
  PassageDraft,
  RealtimePrice,
  RealtimeTokens,
  ReviewOption,
  ReviewRequest,
  ReviewVerdict,
  ScenarioDraft,
  ScoredSubSkill,
  SpeechRequest,
  TokenPrice,
  TranscribeRequest,
  Transcript,
  UsageRecord,
  WritingAssessment,
  WritingCriterion,
  WritingError,
  WritingErrorDraft,
  WritingFeedbackDraft,
  WritingRequest,
} from "./ai.js";
export { AI_FEATURES, ORAL_CRITERIA, WRITING_CRITERIA } from "./ai.js";
export type { BilledAmounts } from "./pricing.js";
export { costOf } from "./pricing.js";
export {
  examinerTurnSchema,
  itemDraftSchema,
  oralAssessmentDraftSchema,
  oralAssessmentSchema,
  passageDraftSchema,
  reviewVerdictSchema,
  scenarioDraftSchema,
  writingAssessmentSchema,
  writingFeedbackDraftSchema,
} from "./schemas/ai.js";

// A spoken session's vocabulary: turns, end reasons, directions (progress.md D116).
export type {
  OralDirection,
  OralEndReason,
  OralInput,
  OralRegister,
  OralSpeaker,
  OralTurn,
} from "./oral-session.js";
export { ORAL_END_REASONS, ORAL_INPUTS, ORAL_SPEAKERS } from "./oral-session.js";
export { oralTurnSchema } from "./schemas/oral.js";
// The oral report's placement rule, D105's per turn (progress.md D122).
export type { AssembleOralResult } from "./oral-assessment.js";
export { assembleOralAssessment, checkOralAssessment } from "./oral-assessment.js";
// The adversarial-review gate, shared by the factory and runtime generation (progress.md D109).
export { CONFIDENCE_THRESHOLD, gateReasons, reviewRequestFor } from "./review-gate.js";
export type { AssembleResult, PlaceErrorsResult } from "./writing.js";
export { assembleAssessment, checkErrorOffsets, findExcerpt, placeErrors } from "./writing.js";

// The writing workshop's prompt library, a content artefact (progress.md D107).
export type { WritingPrompt, WritingRegister } from "./writing-prompt.js";
export { WRITING_REGISTERS } from "./writing-prompt.js";
export type { WritingPromptsParseResult } from "./writing-prompts.js";
export { parseWritingPrompts, parseWritingPromptsOrThrow } from "./writing-prompts.js";
export type { LibraryArticle, LibraryExample, LibrarySection } from "./library-article.js";
export type { LibraryParseResult } from "./library.js";
export { CITED_MARK, parseLibrary, parseLibraryOrThrow } from "./library.js";

// The oral filler list, a content artefact the fluency metrics read (progress.md D123).
export type { OralFillers, OralFillersParseResult } from "./oral-fillers.js";
export { parseOralFillers, parseOralFillersOrThrow, spokenWords } from "./oral-fillers.js";

// Opt-in anonymous item telemetry and the statistics job's report (architecture.md
// 7.6, 9.2). DTOs like the AI ones: no JSON Schema is published for them.
export type {
  ItemStatisticsReport,
  ItemVerdict,
  RestBucket,
  RetirementReason,
  TelemetryEvent,
} from "./telemetry.js";
export { REST_BUCKETS, RETIREMENT_REASONS, TELEMETRY_MAX_RESPONSE_MS } from "./telemetry.js";
export { itemStatisticsReportSchema, telemetryEventSchema } from "./schemas/telemetry.js";

export type {
  CutRange,
  ExamProfile,
  ExamVariant,
  ItemStatisticsRules,
  OralFormat,
} from "./profile/exam-profile.js";
export { examProfileSchema } from "./profile/schema.js";
export type { OrderedCut, ProfileParseResult } from "./profile/parse.js";
export {
  bandsFor,
  orderedCuts,
  leitnerIntervalDays,
  parseExamProfile,
  parseExamProfileOrThrow,
  variant,
  variantNames,
} from "./profile/parse.js";

export {
  attemptSchema,
  examFormSchema,
  itemSchema,
  libraryArticleSchema,
  oralFillersSchema,
  oralScenarioSchema,
  passageSchema,
  writingPromptSchema,
} from "./schemas/content.js";
export type { ContentSchemaName } from "./schemas/index.js";
export { CONTENT_SCHEMA_NAMES, CONTENT_SCHEMAS } from "./schemas/index.js";

// The item type registry (implementation-plan.md §3.4, ADR 17). The React-free
// half; the `render` member lives in `@palier/ui` as `itemRenderers`.
export type {
  A11yContract,
  ItemResponse,
  ItemTypeDefinition,
  ItemValidationCode,
  Outcome,
  PromptContext,
  PromptSpec,
  ValidationIssue,
} from "./item-types/definition.js";
export { ITEM_VALIDATION_CODES } from "./item-types/definition.js";
export { ITEM_TYPE_DEFINITIONS, itemTypeDefinition } from "./item-types/registry.js";
