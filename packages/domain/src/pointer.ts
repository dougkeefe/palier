import type { Localised } from "./localised.js";
import type { Lang } from "./skills.js";
import type { ReadingSubSkill, WritingSubSkill } from "./sub-skills.js";

/**
 * One quick pointer (progress.md D216): a sentence or two of practical advice on one scored
 * sub-skill, shown one a day on Today, published as `@palier/content/pointers/pointers.json`.
 *
 * The advice is in both interface languages (`Localised`). A word or phrase in the practised
 * language (`lang`) is cited inside it `_like this_`, the library's `CITED_MARK`, so the screen
 * renders it with that `lang` (WCAG 3.1.2).
 */
export type Pointer = {
  /** Unique across the file, stable, so a day's choice can be named in a test. */
  readonly id: string;
  readonly subSkill: ReadingSubSkill | WritingSubSkill;
  readonly lang: Lang;
  readonly text: Localised;
};
