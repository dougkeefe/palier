import * as z from "zod";

import { DOC_TYPES, LICENCES } from "../passage.js";
import { ATTEMPT_MODES } from "../attempt.js";
import { ORAL_SESSION_TYPES } from "../oral-scenario.js";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS } from "../sub-skills.js";
import { WRITING_REGISTERS } from "../writing-prompt.js";
import {
  bandSchema,
  contentStatusSchema,
  contributorSchema,
  examModeSchema,
  idSchema,
  isoSchema,
  itemTypeSchema,
  langSchema,
  localisedSchema,
  optionIdSchema,
  scoredSkillSchema,
  skillSchema,
  subSkillSchema,
  targetBandSchema,
  topicSchema,
} from "./primitives.js";

/**
 * The plain shapes are internal and the `.readonly()` wrappers are what gets
 * exported.
 *
 * Two reasons for the split. `.readonly()` makes the inferred output type match
 * the hand-written `readonly` domain type exactly, which is what lets the drift
 * tests use strict equality. And `z.toJSONSchema` adds `"readOnly": true` to a
 * readonly schema, which is noise in a document meant to describe a content
 * artefact for an external validator — so the generator is handed the plain
 * shape instead.
 */

export const itemStatsShape = z.strictObject({
  responses: z.number().int().nonnegative(),
  proportionCorrect: z.number().min(0).max(1),
  // Point-biserial is a correlation, so it is bounded at -1 and 1. Negative is
  // meaningful: it is the signature of a broken key (architecture.md 7.6).
  pointBiserial: z.number().min(-1).max(1).nullable(),
  updatedAt: isoSchema,
});

export const itemProvenanceShape = z.strictObject({
  origin: z.enum(["authored", "generated", "adapted"]),
  sourcePassageId: idSchema.optional(),
  generator: z
    .strictObject({
      model: z.string().min(1),
      promptVersion: z.string().min(1),
      date: isoSchema,
    })
    .optional(),
  reviewedBy: z.string().min(1).optional(),
  reviewedAt: isoSchema.optional(),
  // Optional, so every bank published before it stays valid; validate() requires it of
  // an authored item (content-factory.md §5).
  contributor: contributorSchema.optional(),
});

export const itemOptionShape = z.strictObject({
  id: optionIdSchema,
  text: z.string().min(1),
  // Required, in both locales [R7]. The validator fails on a missing rationale.
  rationale: localisedSchema,
});

export const itemShape = z
  .strictObject({
    id: idSchema,
    version: z.number().int().positive(),
    skill: scoredSkillSchema,
    lang: langSchema,
    type: itemTypeSchema,
    passageId: idSchema.optional(),
    stem: localisedSchema,
    blankIndex: z.number().int().nonnegative().optional(),
    options: z.array(itemOptionShape),
    key: optionIdSchema,
    explanation: localisedSchema,
    subSkill: subSkillSchema,
    targetBand: targetBandSchema,
    stats: itemStatsShape.optional(),
    topic: topicSchema,
    tags: z.array(z.string().min(1)),
    provenance: itemProvenanceShape,
    status: contentStatusSchema,
    createdAt: isoSchema,
    updatedAt: isoSchema,
  })
  .check((ctx) => {
    const item = ctx.value;

    const ids = item.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      ctx.issues.push({
        code: "custom",
        input: item,
        path: ["options"],
        message: "Two options share an id, so one of them can never be chosen.",
      });
    }

    if (!ids.includes(item.key)) {
      ctx.issues.push({
        code: "custom",
        input: item,
        path: ["key"],
        message: `The key is "${item.key}" but no option has that id, so this item has no correct answer.`,
      });
    }

    // A comprehension item is a question about a passage; without one there is
    // nothing to comprehend (architecture.md 5.1).
    if (item.type === "comprehension" && item.passageId === undefined) {
      ctx.issues.push({
        code: "custom",
        input: item,
        path: ["passageId"],
        message: "A comprehension item must name the passage it asks about.",
      });
    }

    if (item.type !== "cloze" && item.blankIndex !== undefined) {
      ctx.issues.push({
        code: "custom",
        input: item,
        path: ["blankIndex"],
        message: `blankIndex describes the position of a blank, which only a cloze item has; this item is "${item.type}".`,
      });
    }
  });

export const passageShape = z.strictObject({
  id: idSchema,
  lang: langSchema,
  docType: z.enum(DOC_TYPES),
  title: z.string().min(1),
  body: z.string().min(1),
  wordCount: z.number().int().positive(),
  targetBand: targetBandSchema,
  topic: topicSchema,
  readability: z.strictObject({
    sentences: z.number().int().positive(),
    avgSentenceLength: z.number().positive(),
    rareWordRatio: z.number().min(0).max(1),
  }),
  source: z
    .strictObject({
      kind: z.enum(["original", "derived"]),
      url: z.url().optional(),
      retrievedAt: isoSchema.optional(),
      licence: z.enum(LICENCES).optional(),
      licenceNote: z.string().min(1).optional(),
      transformation: z.string().min(1).optional(),
      contributor: contributorSchema.optional(),
    })
    .check((ctx) => {
      // "Provenance is not optional... the licensing posture only holds if this
      // data exists and is checked" (architecture.md 5.2). A derived passage
      // without a licence is the case that posture cannot survive.
      if (ctx.value.kind === "derived" && ctx.value.licence === undefined) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          path: ["licence"],
          message:
            "A derived passage must record the licence it was derived under. See LICENSE-CONTENT and architecture.md 5.2.",
        });
      }
      if (ctx.value.kind === "derived" && ctx.value.url === undefined) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          path: ["url"],
          message: "A derived passage must record where it came from.",
        });
      }
    }),
  status: contentStatusSchema,
});

export const oralPhaseShape = z.strictObject({
  name: z.string().min(1),
  minutes: z.number().positive(),
  intent: z.string().min(1),
  seedQuestions: z.array(z.string().min(1)).min(1),
  escalation: z.array(z.string().min(1)),
  deescalation: z.array(z.string().min(1)),
});

export const oralScenarioShape = z.strictObject({
  id: idSchema,
  lang: langSchema,
  sessionType: z.enum(ORAL_SESSION_TYPES),
  targetBand: z.enum(["B", "C"]),
  phases: z.array(oralPhaseShape).min(1),
  topic: topicSchema,
  status: contentStatusSchema.optional(),
});

export const bandCutShape = z.strictObject({
  band: bandSchema,
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
});

export const examFormShape = z
  .strictObject({
    id: idSchema,
    skill: scoredSkillSchema,
    lang: langSchema,
    mode: examModeSchema,
    itemIds: z.array(idSchema),
    pilotItemIds: z.array(idSchema),
    timeLimitMinutes: z.number().int().positive(),
    bandCuts: z.array(bandCutShape).min(1),
    version: z.number().int().positive(),
  })
  .check((ctx) => {
    const form = ctx.value;

    const pilots = new Set(form.pilotItemIds);
    const missing = form.pilotItemIds.filter((id) => !form.itemIds.includes(id));
    if (missing.length > 0) {
      ctx.issues.push({
        code: "custom",
        input: form,
        path: ["pilotItemIds"],
        message: `Pilot items must also appear in itemIds; these do not: ${missing.join(", ")}.`,
      });
    }

    if (new Set(form.itemIds).size !== form.itemIds.length) {
      ctx.issues.push({
        code: "custom",
        input: form,
        path: ["itemIds"],
        message: "The same item appears twice on this form.",
      });
    }

    // Pilot items never affect the score (architecture.md 7.5), so the cut
    // table must top out at the scored count, not the administered count.
    const scored = form.itemIds.length - pilots.size;
    const top = Math.max(...form.bandCuts.map((c) => c.max));
    if (top !== scored) {
      ctx.issues.push({
        code: "custom",
        input: form,
        path: ["bandCuts"],
        message: `The cut table tops out at ${top} but this form has ${scored} scored items. Pilot items are excluded from the score, so the table must end at the scored count.`,
      });
    }
  });

export const attemptShape = z.strictObject({
  id: idSchema,
  itemId: idSchema,
  bankVersion: z.number().int().nonnegative(),
  skill: skillSchema,
  sessionId: idSchema,
  chosen: optionIdSchema,
  correct: z.boolean(),
  msToFirstSelect: z.number().int().nonnegative(),
  msToConfirm: z.number().int().nonnegative(),
  changedAnswer: z.boolean(),
  mode: z.enum(ATTEMPT_MODES),
  ts: isoSchema,
});

export const writingPromptShape = z.strictObject({
  id: idSchema,
  lang: langSchema,
  register: z.enum(WRITING_REGISTERS),
  title: localisedSchema,
  task: z.string().min(1),
  wordTarget: z.number().int().positive(),
  suggestedMinutes: z.number().int().positive(),
});

/**
 * A library article (progress.md D162): one written-expression sub-skill's reference page.
 * Prose in both interface languages, examples in `lang`. `avoid` is optional, since some
 * examples only show the form to write.
 */
const writingSubSkillSchema = z.enum(WRITING_SUB_SKILLS);

export const libraryArticleShape = z.strictObject({
  subSkill: writingSubSkillSchema,
  lang: langSchema,
  title: localisedSchema,
  summary: localisedSchema,
  sections: z
    .array(z.strictObject({ heading: localisedSchema, paragraphs: z.array(localisedSchema).min(1) }))
    .min(1),
  examples: z
    .array(
      z.strictObject({
        avoid: z.string().trim().min(1).optional(),
        write: z.string().trim().min(1),
        why: localisedSchema,
      }),
    )
    .min(1),
  related: z.array(writingSubSkillSchema).min(1).optional(),
});

/**
 * The words a candidate fills a pause with, per language (progress.md D123): the
 * fluency metrics count them. Language, not an exam rule, so content data rather than
 * profile data (ADR 9, ADR 18). Each entry is a word or a short phrase, matched whole
 * and without regard to case.
 */
const fillerListShape = z.array(z.string().trim().min(1)).min(1);

export const oralFillersShape = z.strictObject({
  en: fillerListShape,
  fr: fillerListShape,
});

/**
 * A quick pointer (progress.md D216): practical advice on one reading or written-expression
 * sub-skill, in both interface languages, with practised-language text cited `_like this_`.
 */
export const pointerShape = z.strictObject({
  id: idSchema,
  subSkill: z.enum([...READING_SUB_SKILLS, ...WRITING_SUB_SKILLS]),
  lang: langSchema,
  text: localisedSchema,
});

export const itemSchema = itemShape.readonly();
export const passageSchema = passageShape.readonly();
export const oralScenarioSchema = oralScenarioShape.readonly();
export const examFormSchema = examFormShape.readonly();
export const attemptSchema = attemptShape.readonly();
export const writingPromptSchema = writingPromptShape.readonly();
export const oralFillersSchema = oralFillersShape.readonly();
export const libraryArticleSchema = libraryArticleShape.readonly();
export const pointerSchema = pointerShape.readonly();
