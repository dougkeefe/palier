import type { Localised } from "./localised.js";
import type { Lang } from "./skills.js";
import type { WritingSubSkill } from "./sub-skills.js";

/**
 * One reference article in the library (product-requirements.md §13.2, implementation-plan.md
 * §7 Phase 7; progress.md D145, D162): the grammar or register point one written-expression
 * sub-skill names, published under `@palier/content/library/<subSkill>.json`.
 *
 * Structured content, not MDX: the same Zod-checked JSON pipeline as the bank and the prompts, and
 * no markup toolchain. The prose is in both interface languages (`Localised`); the examples are in
 * the language being practised (`lang`), as a bank item's options are, so the page marks them up
 * with that `lang`. Inside the prose, a cited word or phrase in `lang` is marked `_like this_`
 * (`CITED_MARK`, `library.ts`).
 */
export type LibrarySection = {
  readonly heading: Localised;
  readonly paragraphs: readonly Localised[];
};

/** A sentence to write, and optionally the one to avoid, with why, in both interface languages. */
export type LibraryExample = {
  readonly avoid?: string;
  readonly write: string;
  readonly why: Localised;
};

export type LibraryArticle = {
  readonly subSkill: WritingSubSkill;
  readonly lang: Lang;
  readonly title: Localised;
  /** One or two sentences: what the point is, and why a C-level writer gets it right. */
  readonly summary: Localised;
  readonly sections: readonly LibrarySection[];
  readonly examples: readonly LibraryExample[];
  /** Other articles worth reading next. Never the article itself. */
  readonly related?: readonly WritingSubSkill[];
};
