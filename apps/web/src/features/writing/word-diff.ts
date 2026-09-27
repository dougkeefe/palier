/**
 * The model answer's changes, word by word (product-requirements.md §8.7: "a rewritten
 * model answer … with the changes highlighted"; progress.md D108). A longest common
 * subsequence over whitespace-separated words, so a moved comma or a changed ending shows
 * as the word it belongs to, which is how a reader sees an edit.
 */

export type DiffRun = {
  readonly kind: "same" | "added" | "removed";
  /** The run's words, joined by single spaces. */
  readonly text: string;
};

const wordsOf = (text: string): readonly string[] => text.split(/\s+/u).filter((word) => word !== "");

/**
 * Past this many table cells the diff is not worth its memory: the texts are too far apart
 * for word-level highlighting to help, so the answer shows as one replacement. Two texts of
 * a workshop's length (a few hundred words) are far below it.
 */
export const MAX_DIFF_CELLS = 1_000_000;

const push = (runs: DiffRun[], kind: DiffRun["kind"], word: string): void => {
  const last = runs.at(-1);
  if (last?.kind === kind) runs[runs.length - 1] = { kind, text: `${last.text} ${word}` };
  else runs.push({ kind, text: word });
};

/**
 * How `after` differs from `before`: runs of words kept, added and removed, in reading
 * order, with a removal before the addition that replaces it. Whitespace is not a change.
 */
export const wordDiff = (before: string, after: string): readonly DiffRun[] => {
  const a = wordsOf(before);
  const b = wordsOf(after);
  if (a.length === 0 && b.length === 0) return [];
  // Both sides have words here, since an empty side makes the product zero.
  if (a.length * b.length > MAX_DIFF_CELLS) {
    return [
      { kind: "removed", text: a.join(" ") },
      { kind: "added", text: b.join(" ") },
    ];
  }

  // lcs[i][j] is the length of the longest common subsequence of a[i..] and b[j..].
  const width = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? (lcs[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(lcs[(i + 1) * width + j] ?? 0, lcs[i * width + j + 1] ?? 0);
    }
  }

  const runs: DiffRun[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const wordA = a[i] as string;
    const wordB = b[j] as string;
    if (wordA === wordB) {
      push(runs, "same", wordA);
      i += 1;
      j += 1;
    } else if ((lcs[(i + 1) * width + j] ?? 0) >= (lcs[i * width + j + 1] ?? 0)) {
      push(runs, "removed", wordA);
      i += 1;
    } else {
      push(runs, "added", wordB);
      j += 1;
    }
  }
  for (; i < a.length; i += 1) push(runs, "removed", a[i] as string);
  for (; j < b.length; j += 1) push(runs, "added", b[j] as string);
  return runs;
};
