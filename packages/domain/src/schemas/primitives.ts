import * as z from "zod";

import { BANDS } from "../bands.js";
import { TARGET_BANDS } from "../bands.js";
import {
  CONTENT_STATUSES,
  EXAM_MODES,
  ITEM_TYPES,
  LANGS,
  OPTION_IDS,
  SCORED_SKILLS,
  SKILLS,
} from "../skills.js";
import { ALL_SUB_SKILLS } from "../sub-skills.js";
import { TOPICS } from "../topics.js";

/**
 * `z.enum` over the `as const` arrays, so a union and its schema cannot drift:
 * there is one list, and both the type and the validator read it.
 */
export const bandSchema = z.enum(BANDS);
export const targetBandSchema = z.enum(TARGET_BANDS);
export const skillSchema = z.enum(SKILLS);
export const scoredSkillSchema = z.enum(SCORED_SKILLS);
export const langSchema = z.enum(LANGS);
export const examModeSchema = z.enum(EXAM_MODES);
export const itemTypeSchema = z.enum(ITEM_TYPES);
export const optionIdSchema = z.enum(OPTION_IDS);
export const contentStatusSchema = z.enum(CONTENT_STATUSES);
export const topicSchema = z.enum(TOPICS);
export const subSkillSchema = z.enum(
  ALL_SUB_SKILLS as unknown as [string, ...string[]],
);

/** Ids are non-empty strings; the brand is a compile-time concern only. */
export const idSchema = z.string().min(1);

/**
 * A contributor's public handle, shaped as a GitHub username is: 1 to 39 letters,
 * digits and single hyphens, never starting or ending with one. A handle rather than a
 * free-text name, so an attribution can hold no name, email or other personal detail
 * (content-factory.md §5).
 */
export const contributorSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, {
    message: "A contributor is a public handle such as a GitHub username: letters, digits and single hyphens, 39 at most.",
  });

/** An ISO 8601 instant. */
export const isoSchema = z.iso.datetime();

/**
 * Both locales, both non-empty. A blank string is the failure mode this guards
 * against: it satisfies "the key exists" while leaving a user with nothing,
 * and [R8] is about equal prominence, not equal key counts.
 */
export const localisedSchema = z.strictObject({
  en: z.string().min(1),
  fr: z.string().min(1),
});
