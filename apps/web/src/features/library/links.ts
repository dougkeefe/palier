import { LIBRARY_SUB_SKILLS } from "@palier/domain";

/**
 * Where an item's explanation links (progress.md D162, D254): its sub-skill's library article.
 * Every reading and written-expression sub-skill has one (`parseLibraryOrThrow` refuses a library
 * missing any), and an oral sub-skill has none, so it links nowhere. Kept apart from
 * `lib/library.ts`, which holds the articles themselves, so a drill's link never pulls them into
 * the client's JavaScript.
 */
export const articleHref = (subSkill: string): `/library/${string}` | null =>
  (LIBRARY_SUB_SKILLS as readonly string[]).includes(subSkill) ? `/library/${subSkill}` : null;
