import type {
  WritingAssessment,
  WritingError,
  WritingErrorDraft,
  WritingFeedbackDraft,
} from "./ai.js";

/**
 * The writing-feedback invariants (progress.md D105). Pure, so the adapter, the
 * fake, the stores and the screen hold one rule between them.
 */

/**
 * Why a list of errors cannot be drawn over `text`, or `null` when it can: every
 * range is a whole number, `0 ≤ start < end ≤ text.length`, and no two overlap.
 * Adjacent ranges (one's `end` is the next's `start`) do not overlap. The order
 * the errors arrive in does not matter.
 */
export const checkErrorOffsets = (
  text: string,
  errors: readonly WritingError[],
): string | null => {
  for (const [index, error] of errors.entries()) {
    const { start, end } = error;
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      return `error ${index}: offsets must be whole numbers`;
    }
    if (start < 0 || end > text.length || start >= end) {
      return `error ${index}: [${start}, ${end}) is not a range inside a text of ${text.length} characters`;
    }
  }
  const sorted = [...errors].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1] as WritingError;
    const current = sorted[i] as WritingError;
    if (current.start < previous.end) {
      return `errors [${previous.start}, ${previous.end}) and [${current.start}, ${current.end}) overlap`;
    }
  }
  return null;
};

export type PlaceErrorsResult =
  | { readonly ok: true; readonly errors: readonly WritingError[] }
  | { readonly ok: false; readonly problem: string };

/**
 * Finds each reported excerpt in `text` and gives it offsets. Excerpts are
 * searched for in the order given, each from where the last one ended, so a
 * repeated phrase is placed at its next occurrence; one that is not ahead is
 * searched for from the start, so a list out of reading order still places. The
 * result is in reading order and checked by `checkErrorOffsets`, so an excerpt
 * that is not in the text, or two that land on the same words, is a problem.
 */
export const placeErrors = (
  text: string,
  drafts: readonly WritingErrorDraft[],
): PlaceErrorsResult => {
  const placed: WritingError[] = [];
  let cursor = 0;
  for (const [index, draft] of drafts.entries()) {
    if (draft.excerpt.length === 0) {
      return { ok: false, problem: `error ${index}: the excerpt is empty` };
    }
    let start = text.indexOf(draft.excerpt, cursor);
    if (start === -1) start = text.indexOf(draft.excerpt);
    if (start === -1) {
      return { ok: false, problem: `error ${index}: "${draft.excerpt}" is not in the text` };
    }
    const end = start + draft.excerpt.length;
    placed.push({ start, end, correction: draft.correction, rule: draft.rule });
    cursor = end;
  }
  const ordered = placed.sort((a, b) => a.start - b.start);
  const problem = checkErrorOffsets(text, ordered);
  return problem === null ? { ok: true, errors: ordered } : { ok: false, problem };
};

export type AssembleResult =
  | { readonly ok: true; readonly assessment: WritingAssessment }
  | { readonly ok: false; readonly problem: string };

/** A draft made whole: its errors placed over `text`, or the reason they cannot be. */
export const assembleAssessment = (
  text: string,
  draft: WritingFeedbackDraft,
): AssembleResult => {
  const placed = placeErrors(text, draft.errors);
  if (!placed.ok) return placed;
  return {
    ok: true,
    assessment: { criteria: draft.criteria, errors: placed.errors, modelAnswer: draft.modelAnswer },
  };
};

