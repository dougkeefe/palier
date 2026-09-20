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

export type {
  CutRange,
  ExamProfile,
  ExamVariant,
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
  oralScenarioSchema,
  passageSchema,
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
