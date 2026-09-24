import * as z from "zod";

import { DOC_TYPES } from "../passage.js";
import {
  itemTypeSchema,
  langSchema,
  localisedSchema,
  optionIdSchema,
  subSkillSchema,
  targetBandSchema,
  topicSchema,
} from "./primitives.js";
import { itemOptionShape } from "./content.js";

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

export const passageDraftSchema = passageDraftShape.readonly();
export const itemDraftSchema = itemDraftShape.readonly();
export const reviewVerdictSchema = reviewVerdictShape.readonly();
