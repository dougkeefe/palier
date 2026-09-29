import { WRITING_SUB_SKILLS } from "@palier/domain";

/**
 * Where a written-expression item's explanation links (progress.md D159): its sub-skill's library
 * article. Every written-expression sub-skill has one (`parseLibraryOrThrow` refuses a library
 * missing any), and nothing else does, so a reading item links nowhere. Kept apart from
 * `lib/library.ts`, which holds the articles themselves, so a drill's link never pulls them into
 * the client's JavaScript.
 */
export const articleHref = (subSkill: string): `/library/${string}` | null =>
  (WRITING_SUB_SKILLS as readonly string[]).includes(subSkill) ? `/library/${subSkill}` : null;
