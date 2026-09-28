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

/** What a model is apt to change when it copies words: a curly apostrophe, or a non-breaking space. */
const foldChar = (char: string): string => {
  if (char === "\u2019" || char === "\u2018" || char === "\u02BC") return "'";
  return /\s/u.test(char) ? " " : char;
};

type Folded = { readonly text: string; readonly at: readonly number[] };

/**
 * `text` with every apostrophe straight and every run of whitespace one plain space, and, for
 * each character kept, its index in `text`, so a match found in the folded text maps back.
 */
const fold = (text: string): Folded => {
  let folded = "";
  const at: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = foldChar(text[index] as string);
    if (char === " " && folded.endsWith(" ")) continue;
    folded += char;
    at.push(index);
  }
  return { text: folded, at };
};

/**
 * Where `excerpt` is in `text`, at or after `from`, as `[start, end)` offsets into `text`, or
 * `null` (progress.md D127). A model's quotation is matched as the text reads, not character for
 * character: curly and straight apostrophes are one, and so is any run of whitespace, a
 * non-breaking space before "?" included, and the excerpt's own edges are trimmed. The offsets
 * are the text's own, so a correction is drawn over exactly what was written or said.
 */
export const findExcerpt = (
  text: string,
  excerpt: string,
  from = 0,
): { readonly start: number; readonly end: number } | null => {
  const needle = fold(excerpt).text.trim();
  if (needle.length === 0) return null;
  const haystack = fold(text);
  const fromFolded = haystack.at.findIndex((index) => index >= from);
  if (fromFolded === -1) return null;
  const found = haystack.text.indexOf(needle, fromFolded);
  if (found === -1) return null;
  return {
    start: haystack.at[found] as number,
    end: (haystack.at[found + needle.length - 1] as number) + 1,
  };
};

export type PlaceErrorsResult =
  | { readonly ok: true; readonly errors: readonly WritingError[] }
  | { readonly ok: false; readonly problem: string };

/**
 * Finds each reported excerpt in `text` and gives it offsets. Excerpts are
 * searched for in the order given, each from where the last one ended, so a
 * repeated phrase is placed at its next occurrence; one that is not ahead is
 * searched for from the start, so a list out of reading order still places.
 * Matching folds apostrophes and whitespace (`findExcerpt`, D127). The result is
 * in reading order and checked by `checkErrorOffsets`, so an excerpt that is not
 * in the text, or two that land on the same words, is a problem.
 */
export const placeErrors = (
  text: string,
  drafts: readonly WritingErrorDraft[],
): PlaceErrorsResult => {
  const placed: WritingError[] = [];
  let cursor = 0;
  for (const [index, draft] of drafts.entries()) {
    if (draft.excerpt.trim().length === 0) {
      return { ok: false, problem: `error ${index}: the excerpt is empty` };
    }
    const found = findExcerpt(text, draft.excerpt, cursor) ?? findExcerpt(text, draft.excerpt);
    if (found === null) {
      return { ok: false, problem: `error ${index}: "${draft.excerpt}" is not in the text` };
    }
    placed.push({ start: found.start, end: found.end, correction: draft.correction, rule: draft.rule });
    cursor = found.end;
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

