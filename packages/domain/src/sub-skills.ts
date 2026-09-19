import type { Skill } from "./skills.js";

/**
 * The sub-skill taxonomy from product-requirements.md 13.2. Every item is
 * tagged with exactly one, and it is what the readiness dashboard reports
 * against and what the scheduler targets.
 *
 * The taxonomy also lives in the exam profile (ADR 9), because the PSC could
 * change it and a change should be a data edit. These unions are the
 * compile-time view of the same list; `examProfileSchema` checks that the
 * profile agrees with them, so the two cannot drift silently.
 */
export const READING_SUB_SKILLS = [
  "main-idea",
  "specific-detail",
  "inference",
  "vocabulary-in-context",
  "cohesion-and-reference",
  "tone-and-intent",
  "text-structure",
  "numerical-and-tabular-detail",
] as const;

export const WRITING_SUB_SKILLS = [
  // "including subjunctive, a reliable C discriminator" (13.2).
  "verb-tense-and-mood",
  "agreement",
  "prepositions-and-government",
  "pronouns",
  "connectors-and-discourse-markers",
  "register-and-formality",
  "word-choice-precision",
  "false-friends-and-anglicisms",
  "punctuation-and-mechanics",
  "sentence-structure",
] as const;

export const ORAL_SUB_SKILLS = [
  "comprehension-of-complex-speech",
  "fluency-and-hesitation",
  "grammatical-accuracy-under-pressure",
  "vocabulary-range-and-precision",
  "discourse-organisation",
  "task-achievement",
  "pronunciation-and-intelligibility",
  "interaction-and-repair-strategies",
] as const;

export type ReadingSubSkill = (typeof READING_SUB_SKILLS)[number];
export type WritingSubSkill = (typeof WRITING_SUB_SKILLS)[number];
export type OralSubSkill = (typeof ORAL_SUB_SKILLS)[number];

export type SubSkill = ReadingSubSkill | WritingSubSkill | OralSubSkill;

export const SUB_SKILLS_BY_SKILL = {
  reading: READING_SUB_SKILLS,
  writing: WRITING_SUB_SKILLS,
  oral: ORAL_SUB_SKILLS,
} as const satisfies Record<Skill, readonly SubSkill[]>;

export const ALL_SUB_SKILLS: readonly SubSkill[] = [
  ...READING_SUB_SKILLS,
  ...WRITING_SUB_SKILLS,
  ...ORAL_SUB_SKILLS,
];

export const subSkillsFor = (skill: Skill): readonly SubSkill[] =>
  SUB_SKILLS_BY_SKILL[skill];
