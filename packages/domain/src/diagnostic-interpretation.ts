import type { DiagnosticInterpretation, DiagnosticInterpretationRequest } from "./ai.js";
import { SUB_SKILLS_BY_SKILL } from "./sub-skills.js";

/**
 * The shortest stem worth guarding (ADR 25). A shorter one, a word or two, could turn up in
 * honest advice by coincidence; a longer one in the interpretation is the question quoted.
 */
const GUARDED_STEM_LENGTH = 24;

const normalise = (text: string): string => text.toLowerCase().replace(/\s+/g, " ").trim();

const textsOf = (interpretation: DiagnosticInterpretation): readonly string[] => [
  interpretation.headline,
  interpretation.summary,
  ...interpretation.strengths,
  ...interpretation.priorities.flatMap((priority) => [priority.what, priority.why]),
  interpretation.planNote,
];

/**
 * Why an interpretation cannot be shown for `request`, or `null` when it can (ADR 25): every
 * priority names a sub-skill of the run's own skill, no sub-skill is a priority twice, and no
 * text quotes a missed item's stem, since the result screen never shows a question and a later
 * run should not be spoiled. Checked on the model's reply, so a failure is retried, and on a
 * stored interpretation read back.
 */
export const checkDiagnosticInterpretation = (
  request: DiagnosticInterpretationRequest,
  interpretation: DiagnosticInterpretation,
): string | null => {
  const known: readonly string[] = SUB_SKILLS_BY_SKILL[request.skill];
  const seen = new Set<string>();
  for (const [index, priority] of interpretation.priorities.entries()) {
    if (!known.includes(priority.subSkill)) {
      return `priority ${index} names "${priority.subSkill}", which is not a ${request.skill} sub-skill`;
    }
    if (seen.has(priority.subSkill)) return `priority ${index} repeats "${priority.subSkill}"`;
    seen.add(priority.subSkill);
  }
  const texts = textsOf(interpretation).map(normalise);
  for (const miss of request.missed) {
    const stem = normalise(miss.stem);
    if (stem.length < GUARDED_STEM_LENGTH) continue;
    if (texts.some((text) => text.includes(stem))) {
      return "the interpretation quotes a missed question; describe the pattern without quoting it";
    }
  }
  return null;
};
