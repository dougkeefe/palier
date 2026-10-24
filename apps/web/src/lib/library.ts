import agreement from "@palier/content/library/agreement.json";
import cohesion from "@palier/content/library/cohesion-and-reference.json";
import connectors from "@palier/content/library/connectors-and-discourse-markers.json";
import falseFriends from "@palier/content/library/false-friends-and-anglicisms.json";
import inference from "@palier/content/library/inference.json";
import mainIdea from "@palier/content/library/main-idea.json";
import numerical from "@palier/content/library/numerical-and-tabular-detail.json";
import prepositions from "@palier/content/library/prepositions-and-government.json";
import pronouns from "@palier/content/library/pronouns.json";
import punctuation from "@palier/content/library/punctuation-and-mechanics.json";
import register from "@palier/content/library/register-and-formality.json";
import sentenceStructure from "@palier/content/library/sentence-structure.json";
import specificDetail from "@palier/content/library/specific-detail.json";
import textStructure from "@palier/content/library/text-structure.json";
import tone from "@palier/content/library/tone-and-intent.json";
import verbTense from "@palier/content/library/verb-tense-and-mood.json";
import vocabulary from "@palier/content/library/vocabulary-in-context.json";
import wordChoice from "@palier/content/library/word-choice-precision.json";
import type { LibraryArticle, ScoredSkill } from "@palier/domain";
import { READING_SUB_SKILLS, WRITING_SUB_SKILLS, parseLibraryOrThrow } from "@palier/domain";

/**
 * The library (PRD §13.2, progress.md D145, D162, D254): one reference article per reading and
 * written-expression sub-skill, parsed once here, like the profile and the prompts, from
 * `@palier/content/library/`. `parseLibraryOrThrow` refuses a library missing any sub-skill's
 * article, so every link an item's explanation makes has a page.
 *
 * **Server only in practice.** The pages that render an article are server components; a drill's
 * link needs only the item's sub-skill (`features/library/links.ts`), so the articles never reach the client JS.
 */
export const LIBRARY: readonly LibraryArticle[] = parseLibraryOrThrow([
  mainIdea,
  specificDetail,
  inference,
  vocabulary,
  cohesion,
  tone,
  textStructure,
  numerical,
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

const SUB_SKILLS_OF = { reading: READING_SUB_SKILLS, writing: WRITING_SUB_SKILLS } as const;

/** One skill's articles, in the profile's order, which is the taxonomy's (PRD §13.2). */
export const libraryArticlesFor = (skill: ScoredSkill): readonly LibraryArticle[] =>
  SUB_SKILLS_OF[skill].map((subSkill) => LIBRARY.find((article) => article.subSkill === subSkill) as LibraryArticle);

/** The article for a route segment, or null for anything that is not a reading or written-expression sub-skill. */
export const articleFor = (segment: string): LibraryArticle | null =>
  LIBRARY.find((article) => article.subSkill === segment) ?? null;
