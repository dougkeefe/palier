import type { WritingError } from "@palier/domain";

/**
 * The user's own text, cut at the assessment's offsets so each error is drawn over the
 * words it names (architecture.md §8.4: "offsets rather than a rewritten string"). The
 * offsets were checked by `checkErrorOffsets` before they were stored, so every range is
 * inside the text and none overlap (progress.md D105).
 */
export type TextSegment =
  | { readonly kind: "plain"; readonly text: string }
  | {
      readonly kind: "error";
      readonly text: string;
      /** 1-based, in reading order: the number the list of corrections uses. */
      readonly number: number;
      readonly error: WritingError;
    };

export const segmentText = (text: string, errors: readonly WritingError[]): readonly TextSegment[] => {
  const segments: TextSegment[] = [];
  let cursor = 0;
  const ordered = [...errors].sort((a, b) => a.start - b.start);
  for (const [index, error] of ordered.entries()) {
    if (error.start > cursor) segments.push({ kind: "plain", text: text.slice(cursor, error.start) });
    segments.push({ kind: "error", text: text.slice(error.start, error.end), number: index + 1, error });
    cursor = error.end;
  }
  if (cursor < text.length) segments.push({ kind: "plain", text: text.slice(cursor) });
  return segments;
};
