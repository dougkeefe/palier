import type { Lang } from "./skills.js";
import type { WritingSubSkill } from "./sub-skills.js";

/**
 * One quick grammar pointer (progress.md D216, D218): a sentence or two on one grammar or usage
 * point, shown one a day on Today, published as `@palier/content/pointers/pointers.json`.
 *
 * Written **in the language being practised** (`lang`), whatever the interface's, because it is a
 * piece of that language to take in, not an instruction about it. Its sub-skill is a
 * written-expression one, the taxonomy's grammar and usage points. Inside the text an example is
 * marked `_like this_`, the library's `CITED_MARK`, and set in italics.
 */
export type Pointer = {
  /** Unique across the file, stable, so a day's choice can be named in a test. */
  readonly id: string;
  readonly subSkill: WritingSubSkill;
  readonly lang: Lang;
  readonly text: string;
};
