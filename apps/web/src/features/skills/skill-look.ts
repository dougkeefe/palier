import type { ScoredSkill } from "@palier/domain";
import type { CardTone, GlyphName } from "@palier/ui";

/** The three domains of study: the two scored skills and speaking. */
export type SkillKind = ScoredSkill | "oral";

/**
 * Each domain's fill and mark (D219), shared by Today's hero and the progress page's (D245), so the
 * same skill wears the same colour and glyph wherever it appears. The fill is never the only thing
 * that names it: every card also carries the skill's name in words.
 */
export const SKILL_LOOK: Readonly<Record<SkillKind, { readonly tone: CardTone; readonly glyph: GlyphName }>> = {
  reading: { tone: "tint", glyph: "book" },
  writing: { tone: "mint", glyph: "pen" },
  oral: { tone: "rose", glyph: "mic" },
};
