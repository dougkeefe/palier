import * as z from "zod";

import { ORAL_CRITERIA } from "../ai.js";
import { DOC_TYPES } from "../passage.js";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "../sub-skills.js";
import {
  bandSchema,
  itemTypeSchema,
  langSchema,
  localisedSchema,
  optionIdSchema,
  subSkillSchema,
  targetBandSchema,
  topicSchema,
} from "./primitives.js";
import { itemOptionShape, oralPhaseShape } from "./content.js";

/**
 * Schemas for the AI structured-output payloads (architecture.md §8.2). Every
 * non-realtime call re-validates the model's response client-side with the same
 * Zod schema before use; these are those schemas. They are the model's creative
 * output only — the factory assembles the full `Item`/`Passage` around a draft —
 * so the cross-field content invariants (a key that names a real option, a
 * derived passage's licence) are checked later by `itemSchema`/`passageSchema`
 * and the registry `validate`, not here. Kept as plain `strictObject`s so a
 * malformed field is rejected at the edge without duplicating those rules.
 *
 * These are DTOs, not content artefacts, so they are deliberately absent from
 * `CONTENT_SCHEMAS` — no JSON Schema is published for them.
 */

export const passageDraftShape = z.strictObject({
  lang: langSchema,
  docType: z.enum(DOC_TYPES),
  title: z.string().min(1),
  body: z.string().min(1),
  targetBand: targetBandSchema,
  topic: topicSchema,
});

export const itemDraftShape = z.strictObject({
  type: itemTypeSchema,
  stem: localisedSchema,
  blankIndex: z.number().int().nonnegative().optional(),
  options: z.array(itemOptionShape),
  key: optionIdSchema,
  explanation: localisedSchema,
  subSkill: subSkillSchema,
  targetBand: targetBandSchema,
  topic: topicSchema,
});

export const reviewVerdictShape = z.strictObject({
  chosenKey: optionIdSchema,
  confidence: z.number().min(0).max(1),
  defensibleDistractors: z.array(optionIdSchema),
  optionCases: z.record(optionIdSchema, z.string().min(1)),
  registerFlag: z.strictObject({
    flagged: z.boolean(),
    note: z.string().min(1).optional(),
  }),
  estimatedBand: targetBandSchema,
});

const criterionShape = z.strictObject({
  band: bandSchema,
  evidence: z.string().min(1),
});

/** Exactly the five criteria of `WRITING_CRITERIA`, no more and none missing. */
const criteriaShape = z.strictObject({
  register: criterionShape,
  structure: criterionShape,
  grammar: criterionShape,
  vocabulary: criterionShape,
  task: criterionShape,
});

/**
 * What the model returns for writing feedback: errors as excerpts, not offsets
 * (progress.md D105). `placeErrors` turns them into a `WritingAssessment`.
 */
export const writingFeedbackDraftShape = z.strictObject({
  criteria: criteriaShape,
  errors: z.array(
    z.strictObject({
      excerpt: z.string().min(1),
      correction: z.string().min(1),
      rule: z.string().min(1),
    }),
  ),
  modelAnswer: z.string().min(1),
});

/**
 * A placed assessment's shape. The offsets are checked against the text by
 * `checkErrorOffsets`, which a schema cannot do because it does not see the text.
 */
export const writingAssessmentShape = z.strictObject({
  criteria: criteriaShape,
  errors: z.array(
    z.strictObject({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      correction: z.string().min(1),
      rule: z.string().min(1),
    }),
  ),
  modelAnswer: z.string().min(1),
});

/** A scenario's phase plan (progress.md D114). The factory checks the minutes. */
export const scenarioDraftShape = z.strictObject({
  phases: z.array(oralPhaseShape).min(1),
});

/**
 * The examiner's next turn in practice mode (progress.md D117): a short question in
 * the language being practised, and a difficulty flag or `null`.
 */
export const examinerTurnShape = z.strictObject({
  text: z.string().trim().min(1),
  difficulty: z.enum(["escalate", "deescalate"]).nullable(),
});

/** Exactly the five criteria of `ORAL_CRITERIA` (progress.md D122). */
const oralCriteriaShape = z.strictObject({
  comprehension: criterionShape,
  fluency: criterionShape,
  grammar: criterionShape,
  vocabulary: criterionShape,
  task: criterionShape,
});

const turnIndexShape = z.number().int().nonnegative();


/**
 * Up to three fixes, most costly first, each on a sub-skill the bank can drill (D122):
 * reading or writing, never oral, since the bank has no oral items. At least one; fewer than
 * three when a short session gives too little evidence (D127).
 */
const oralFixesShape = z
  .array(
    z.strictObject({
      criterion: z.enum(ORAL_CRITERIA),
      subSkill: z.enum([...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS]),
      advice: z.string().min(1),
      evidence: z.string().min(1),
    }),
  )
  .min(1)
  .max(3);

const missingWordsShape = z
  .array(
    z.strictObject({
      word: z.string().trim().min(1),
      turn: turnIndexShape,
      excerpt: z.string().min(1),
      example: z.string().min(1),
    }),
  )
  .min(1)
  .max(5);

/**
 * What the model returns for a session's report: errors as a turn and an excerpt,
 * not offsets (D105, D122). `assembleOralAssessment` places them.
 */
export const oralAssessmentDraftShape = z.strictObject({
  criteria: oralCriteriaShape,
  fixes: oralFixesShape,
  missingWords: missingWordsShape,
  errors: z.array(
    z.strictObject({
      turn: turnIndexShape,
      excerpt: z.string().min(1),
      correction: z.string().min(1),
      rule: z.string().min(1),
    }),
  ),
});

/**
 * A placed report's shape. Whether each turn index names a candidate's turn, and
 * each range fits it, is `checkOralAssessment`'s, since a schema does not see the
 * turns.
 */
export const oralAssessmentShape = z.strictObject({
  criteria: oralCriteriaShape,
  fixes: oralFixesShape,
  missingWords: missingWordsShape,
  errors: z.array(
    z.strictObject({
      turn: turnIndexShape,
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      correction: z.string().min(1),
      rule: z.string().min(1),
    }),
  ),
});

/**
 * A diagnostic run's written interpretation (ADR 25). Whether each priority's sub-skill belongs
 * to the run's skill, and whether any text quotes a missed question, is
 * `checkDiagnosticInterpretation`'s, since a schema does not see the request.
 */
export const diagnosticInterpretationShape = z.strictObject({
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)).max(3),
  priorities: z
    .array(
      z.strictObject({
        subSkill: z.enum([...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS]),
        what: z.string().trim().min(1),
        why: z.string().trim().min(1),
      }),
    )
    .min(1)
    .max(3),
  planNote: z.string().trim().min(1),
});

export const passageDraftSchema = passageDraftShape.readonly();
export const itemDraftSchema = itemDraftShape.readonly();
export const reviewVerdictSchema = reviewVerdictShape.readonly();
export const writingFeedbackDraftSchema = writingFeedbackDraftShape.readonly();
export const writingAssessmentSchema = writingAssessmentShape.readonly();
export const scenarioDraftSchema = scenarioDraftShape.readonly();
export const examinerTurnSchema = examinerTurnShape.readonly();
export const oralAssessmentDraftSchema = oralAssessmentDraftShape.readonly();
export const oralAssessmentSchema = oralAssessmentShape.readonly();
export const diagnosticInterpretationSchema = diagnosticInterpretationShape.readonly();
