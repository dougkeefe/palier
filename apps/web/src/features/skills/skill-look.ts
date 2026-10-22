import type { ScoredSkill } from "@palier/domain";
import type { GlyphName, TabTone } from "@palier/ui";

/** The three domains of study: the two scored skills and speaking. */
export type SkillKind = ScoredSkill | "oral";

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
