import type { Localised } from "./localised.js";
import type { Lang } from "./skills.js";
import type { ReadingSubSkill, WritingSubSkill } from "./sub-skills.js";

/**
 * One reference article in the library (product-requirements.md §13.2, implementation-plan.md
 * §7 Phase 7; progress.md D145, D162, D254): the point one reading or written-expression
 * sub-skill names, published under `@palier/content/library/<subSkill>.json`.
 *
 * Structured content, not MDX: the same Zod-checked JSON pipeline as the bank and the prompts, and
 * no markup toolchain. The prose is in both interface languages (`Localised`); the examples are in
 * the language being practised (`lang`), as a bank item's options are, so the page marks them up
 * with that `lang`. Inside the prose, a cited word or phrase in `lang` is marked `_like this_`
 * (`CITED_MARK`, `library.ts`).
 *
 * **A writing article and a reading article differ in their examples**: a writing article shows a
 * sentence to write, a reading article an excerpt to read. Each relates only to its own skill's
 * articles. The sub-skill tells the two apart, so the type cannot mix them.
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

/** A short original passage in `lang`, and what a careful reader notices in it (D254). */
export type LibraryExcerpt = {
  readonly excerpt: string;
  readonly why: Localised;
};

/**
 * The library's topics (progress.md D257): what an article is about, across the two skills, so the
 * index can be filtered by it. Every article has exactly one. The labels are the app's messages.
 */
export const LIBRARY_TOPICS = ["comprehension", "vocabulary", "grammar", "structure", "register"] as const;
export type LibraryTopic = (typeof LIBRARY_TOPICS)[number];

type ArticleCommon = {
  readonly lang: Lang;
  readonly topic: LibraryTopic;
  readonly title: Localised;
  /** One or two sentences: what the point is, and why a C-level candidate gets it right. */
  readonly summary: Localised;
  readonly sections: readonly LibrarySection[];
};

export type WritingLibraryArticle = ArticleCommon & {
  readonly subSkill: WritingSubSkill;
  readonly examples: readonly LibraryExample[];
  /** Other written-expression articles worth reading next. Never the article itself. */
  readonly related?: readonly WritingSubSkill[];
};

export type ReadingLibraryArticle = ArticleCommon & {
  readonly subSkill: ReadingSubSkill;
  readonly examples: readonly LibraryExcerpt[];
  /** Other reading articles worth reading next. Never the article itself. */
  readonly related?: readonly ReadingSubSkill[];
};

export type LibraryArticle = WritingLibraryArticle | ReadingLibraryArticle;

/** A sub-skill the library has an article for: reading's and written expression's, never oral's. */
export type LibrarySubSkill = LibraryArticle["subSkill"];
