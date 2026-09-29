import agreement from "@palier/content/library/agreement.json";
import connectors from "@palier/content/library/connectors-and-discourse-markers.json";
import falseFriends from "@palier/content/library/false-friends-and-anglicisms.json";
import prepositions from "@palier/content/library/prepositions-and-government.json";
import pronouns from "@palier/content/library/pronouns.json";
import punctuation from "@palier/content/library/punctuation-and-mechanics.json";
import register from "@palier/content/library/register-and-formality.json";
import sentenceStructure from "@palier/content/library/sentence-structure.json";
import verbTense from "@palier/content/library/verb-tense-and-mood.json";
import wordChoice from "@palier/content/library/word-choice-precision.json";
import type { LibraryArticle } from "@palier/domain";
import { WRITING_SUB_SKILLS, parseLibraryOrThrow } from "@palier/domain";

/**
 * The library (PRD §13.2, progress.md D145, D162): one reference article per written-expression
 * sub-skill, parsed once here, like the profile and the prompts, from `@palier/content/library/`.
 * `parseLibraryOrThrow` refuses a library missing any sub-skill's article, so every link a writing
 * item's explanation makes has a page.
 *
 * **Server only in practice.** The pages that render an article are server components; a drill's
 * link needs only the item's sub-skill (`features/library/links.ts`), so the articles never reach the client JS.
 */
export const LIBRARY: readonly LibraryArticle[] = parseLibraryOrThrow([
  verbTense,
  agreement,
  prepositions,
  pronouns,
  connectors,
  register,
  wordChoice,
  falseFriends,
  punctuation,
  sentenceStructure,
]);

/** The profile's order, which is the taxonomy's (PRD §13.2). */
export const libraryArticles = (): readonly LibraryArticle[] =>
  WRITING_SUB_SKILLS.map((subSkill) => LIBRARY.find((article) => article.subSkill === subSkill) as LibraryArticle);

/** The article for a route segment, or null for anything that is not a written-expression sub-skill. */
export const articleFor = (segment: string): LibraryArticle | null =>
  LIBRARY.find((article) => article.subSkill === segment) ?? null;
