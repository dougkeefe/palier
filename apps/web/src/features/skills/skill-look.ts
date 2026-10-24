import type { ScoredSkill } from "@palier/domain";
import { SCORED_SKILLS } from "@palier/domain";
import type { GlyphName, TabTone } from "@palier/ui";

/** The three domains of study: the two scored skills and speaking. */
export type SkillKind = ScoredSkill | "oral";

/** The three in the order the app always names them: reading, writing, then speaking (D247, D248). */
export const SKILL_KINDS: readonly SkillKind[] = [...SCORED_SKILLS, "oral"];

/**
 * Each domain's fill and mark (D219), shared by Today's hero, the progress page's (D245) and its
 * detail's tabs (D247), so the same skill wears the same colour and glyph wherever it appears. The
 * fill is never the only thing that names it: every card and tab also carries the skill's name in words.
 */
export const SKILL_LOOK: Readonly<Record<SkillKind, { readonly tone: TabTone; readonly glyph: GlyphName }>> = {
  reading: { tone: "tint", glyph: "book" },
  writing: { tone: "mint", glyph: "pen" },
  oral: { tone: "rose", glyph: "mic" },
};
