/** The three skills the SLE tests [R1]. */
export const SKILLS = ["reading", "writing", "oral"] as const;
export type Skill = (typeof SKILLS)[number];

/** The two skills with a multiple-choice paper and a published cut table. */
export const SCORED_SKILLS = ["reading", "writing"] as const;
export type ScoredSkill = (typeof SCORED_SKILLS)[number];

export const LANGS = ["en", "fr"] as const;
export type Lang = (typeof LANGS)[number];

export const EXAM_MODES = ["supervised", "unsupervised"] as const;
export type ExamMode = (typeof EXAM_MODES)[number];

export const ITEM_TYPES = [
  "cloze",
  "comprehension",
  "error-id",
  "best-completion",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const OPTION_IDS = ["a", "b", "c", "d"] as const;
export type OptionId = (typeof OPTION_IDS)[number];

export const CONTENT_STATUSES = ["draft", "review", "published", "retired"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
