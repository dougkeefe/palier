import * as z from "zod";

import type { LibraryArticle } from "./library-article.js";
import { libraryArticleSchema } from "./schemas/content.js";
import { WRITING_SUB_SKILLS } from "./sub-skills.js";

/**
 * Parses an **already-read** library, as `parseWritingPrompts` parses the prompts: no I/O here,
 * the app imports the JSON (progress.md D159). The library is **one article per written-expression
 * sub-skill, exactly**: an item's explanation links to its sub-skill's article, so a missing one is
 * a dead link and a repeated one is ambiguous. Every `related` id must be another sub-skill.
 *
 * **Cited text is marked `_like this_`** in the prose (the summary, the paragraphs and each
 * example's `why`): a word or phrase in the article's `lang`, quoted inside interface-language
 * prose. The page renders it in italics with that `lang`, so a screen reader reads French words in
 * French (WCAG 3.1.2, progress.md D151). An unpaired marker is refused, since it would italicise
 * the rest of the paragraph.
 */

export type LibraryParseResult =
  | { readonly ok: true; readonly articles: readonly LibraryArticle[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/** The marker around cited target-language text. */
export const CITED_MARK = "_";

const unpaired = (text: string): boolean => text.split(CITED_MARK).length % 2 === 0;

/** Every prose string an article marks up, with its path. */
const prose = (article: LibraryArticle): [(string | number)[], string][] =>
  (["en", "fr"] as const).flatMap((locale) => [
    [["summary", locale], article.summary[locale]] as [(string | number)[], string],
    ...article.sections.flatMap((section, s) =>
      section.paragraphs.map((paragraph, p) => [["sections", s, "paragraphs", p, locale], paragraph[locale]] as [(string | number)[], string]),
    ),
    ...article.examples.map((example, e) => [["examples", e, "why", locale], example.why[locale]] as [(string | number)[], string]),
  ]);

const librarySchema = z.array(libraryArticleSchema).superRefine((articles, ctx) => {
  const seen = new Set<string>();
  for (const [index, article] of articles.entries()) {
    for (const [path, text] of prose(article as LibraryArticle)) {
      if (unpaired(text)) ctx.addIssue({ code: "custom", path: [index, ...path], message: `an unpaired "${CITED_MARK}"` });
    }
    if (seen.has(article.subSkill)) {
      ctx.addIssue({ code: "custom", path: [index, "subSkill"], message: `"${article.subSkill}" has two articles` });
    }
    seen.add(article.subSkill);
    for (const [r, related] of (article.related ?? []).entries()) {
      if (related === article.subSkill) {
        ctx.addIssue({ code: "custom", path: [index, "related", r], message: "an article cannot relate to itself" });
      }
    }
  }
  for (const subSkill of WRITING_SUB_SKILLS) {
    if (!seen.has(subSkill)) ctx.addIssue({ code: "custom", path: [], message: `"${subSkill}" has no article` });
  }
});

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

export const parseLibrary = (value: unknown): LibraryParseResult => {
  const result = librarySchema.safeParse(value);
  if (!result.success) return { ok: false, errors: result.error.issues.map(formatIssue) };
  return { ok: true, articles: result.data as readonly LibraryArticle[] };
};

/** The throwing form, for the app, where a bad library is a build defect. */
export const parseLibraryOrThrow = (value: unknown): readonly LibraryArticle[] => {
  const result = parseLibrary(value);
  if (!result.ok) throw new Error(`The library is not valid:\n  ${result.errors.join("\n  ")}`);
  return result.articles;
};
