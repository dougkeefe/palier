import type {
  Translation,
  TranslationCorrection,
  TranslationDraft,
  TranslationRequest,
} from "./ai.js";
import { checkErrorOffsets, findExcerpt } from "./writing.js";

/**
 * The translator's invariants (progress.md D248). Pure, so the adapter, the fake and the screen
 * hold one rule between them, as `writing.ts` does for writing feedback.
 */

export type AssembleTranslationResult =
  | { readonly ok: true; readonly translation: Translation }
  | { readonly ok: false; readonly problem: string };

/**
 * Why `translation` cannot be shown over `text`, or `null` when it can. A text in the target
 * language is a **correction**: it may have strengths and placed corrections, and no notes. Any
 * other is a **translation**: it may have notes, and no strengths or corrections, since there is
 * no attempt at the target language to judge.
 */
export const checkTranslation = (text: string, translation: Translation): string | null => {
  if (translation.source === translation.target) {
    if (translation.notes.length > 0) return "a correction has no translation notes";
    return checkErrorOffsets(
      text,
      translation.corrections.map(({ start, end, correction, why }) => ({ start, end, correction, rule: why })),
    );
  }
  if (translation.strengths.length > 0) return "a translation has no strengths to report";
  if (translation.corrections.length > 0) return "a translation has no corrections to place";
  return null;
};

/**
 * A draft made whole (D248). When the user said which language the text is in, the model must
 * agree, or the answer is malformed and retried. A correction's excerpts are found in the text the
 * way `placeErrors` finds them, each from where the last one ended, then from the start, and come
 * back in reading order with their sub-skill and reason; an excerpt not in the text, or two on the
 * same words, is a problem.
 */
export const assembleTranslation = (
  request: TranslationRequest,
  draft: TranslationDraft,
): AssembleTranslationResult => {
  if (request.source !== null && draft.source !== request.source) {
    return { ok: false, problem: `the text is in "${request.source}", not "${draft.source}"` };
  }
  const placed: TranslationCorrection[] = [];
  let cursor = 0;
  for (const [index, correction] of draft.corrections.entries()) {
    if (correction.excerpt.trim().length === 0) {
      return { ok: false, problem: `correction ${String(index)}: the excerpt is empty` };
    }
    const found = findExcerpt(request.text, correction.excerpt, cursor) ?? findExcerpt(request.text, correction.excerpt);
    if (found === null) {
      return { ok: false, problem: `correction ${String(index)}: "${correction.excerpt}" is not in the text` };
    }
    placed.push({
      start: found.start,
      end: found.end,
      correction: correction.correction,
      why: correction.why,
      subSkill: correction.subSkill,
    });
    cursor = found.end;
  }
  const translation: Translation = {
    source: draft.source,
    target: request.target,
    output: draft.output,
    strengths: draft.strengths,
    corrections: placed.sort((a, b) => a.start - b.start),
    notes: draft.notes,
  };
  const problem = checkTranslation(request.text, translation);
  return problem === null ? { ok: true, translation } : { ok: false, problem };
};
