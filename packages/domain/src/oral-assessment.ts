import type {
  MissingWord,
  OralAssessment,
  OralAssessmentDraft,
  OralTurnError,
  OralTurnErrorDraft,
  WritingError,
} from "./ai.js";
import type { OralTurn } from "./oral-session.js";
import { checkErrorOffsets, findExcerpt, placeErrors } from "./writing.js";

/**
 * The oral report's invariants (progress.md D122), D105's rule per turn: a model
 * quotes the candidate's words and names the turn, and the offsets are placed here.
 * Pure, so the adapter, the fake, the store and the screen hold one rule.
 */

export type AssembleOralResult =
  | { readonly ok: true; readonly assessment: OralAssessment }
  | { readonly ok: false; readonly problem: string };

/** Why `turn` cannot carry a correction, or `null` when it names a candidate's turn. */
const candidateTurnProblem = (turns: readonly OralTurn[], turn: number, what: string): string | null => {
  const found = turns[turn];
  if (found === undefined) return `${what}: there is no turn ${turn}`;
  if (found.speaker !== "candidate") return `${what}: turn ${turn} is the examiner's, not the candidate's`;
  return null;
};

/**
 * Each missing word names a candidate's turn, and quotes words that are in it, matched as `findExcerpt`
 * matches (D127). Words come with their index in the list the model sent, so a problem names the
 * item the model wrote, whatever was dropped before it.
 */
const missingWordsProblem = (
  turns: readonly OralTurn[],
  words: readonly (readonly [number, MissingWord])[],
): string | null => {
  for (const [index, word] of words) {
    const what = `missing word ${index}`;
    const problem = candidateTurnProblem(turns, word.turn, what);
    if (problem !== null) return problem;
    if (findExcerpt((turns[word.turn] as OralTurn).text, word.excerpt) === null) {
      return `${what}: "${word.excerpt}" is not in turn ${word.turn}`;
    }
  }
  return null;
};

/**
 * Whether an excerpt quotes words. One of only spaces or punctuation would mark a comma, so it is
 * dropped rather than placed, and never costs the rest of the report (progress.md D127).
 */
const quotesWords = (excerpt: string): boolean => /[\p{L}\p{N}]/u.test(excerpt);

/** Groups items by their `turn`, keeping each turn's items in the order given. */
const byTurn = <T extends { readonly turn: number }>(items: readonly T[]): Map<number, T[]> => {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const group = groups.get(item.turn);
    if (group === undefined) groups.set(item.turn, [item]);
    else group.push(item);
  }
  return groups;
};

/**
 * A draft made whole: each error placed over its own turn by `placeErrors`, in turn
 * order and then reading order, or the reason it cannot be. An error or a missing word whose
 * excerpt quotes no word is dropped first (D127). A problem is an error or
 * a missing word naming a turn that does not exist or is the examiner's, or an
 * excerpt that is not in its turn, or two errors on the same words.
 */
export const assembleOralAssessment = (
  turns: readonly OralTurn[],
  draft: OralAssessmentDraft,
): AssembleOralResult => {
  // Dropped first, but a turn check and a missing word still name the item by its index in the draft
  // as sent, since that is what the retry tells the model to mend (D127). A placement problem numbers
  // the kept errors within its turn, as `placeErrors` always has, and quotes the excerpt.
  const errors = [...draft.errors.entries()].filter(([, error]) => quotesWords(error.excerpt));
  const words = [...draft.missingWords.entries()].filter(([, word]) => quotesWords(word.excerpt));
  if (words.length === 0) return { ok: false, problem: "no missing word quotes the candidate's words" };
  for (const [index, error] of errors) {
    const problem = candidateTurnProblem(turns, error.turn, `error ${index}`);
    if (problem !== null) return { ok: false, problem };
  }
  const placed: OralTurnError[] = [];
  const groups = [...byTurn<OralTurnErrorDraft>(errors.map(([, error]) => error))].sort(([a], [b]) => a - b);
  for (const [turn, drafts] of groups) {
    const result = placeErrors((turns[turn] as OralTurn).text, drafts);
    if (!result.ok) return { ok: false, problem: `turn ${turn}, ${result.problem}` };
    placed.push(...result.errors.map((error) => ({ turn, ...error })));
  }
  const problem = missingWordsProblem(turns, words);
  if (problem !== null) return { ok: false, problem };
  return {
    ok: true,
    assessment: {
      criteria: draft.criteria,
      fixes: draft.fixes,
      missingWords: words.map(([, word]) => word),
      errors: placed,
    },
  };
};

/**
 * Why a placed report cannot be drawn over `turns`, or `null` when it can: every
 * error and missing word names a candidate's turn, every error's range fits that
 * turn and overlaps no other in it (`checkErrorOffsets`), and every missing word's
 * excerpt is in its turn. For a report read back from storage, whose turns are its
 * own (the Dexie read path, D122).
 */
export const checkOralAssessment = (turns: readonly OralTurn[], assessment: OralAssessment): string | null => {
  for (const [index, error] of assessment.errors.entries()) {
    const problem = candidateTurnProblem(turns, error.turn, `error ${index}`);
    if (problem !== null) return problem;
  }
  for (const [turn, errors] of byTurn(assessment.errors)) {
    const ranges: WritingError[] = errors.map(({ start, end, correction, rule }) => ({ start, end, correction, rule }));
    const problem = checkErrorOffsets((turns[turn] as OralTurn).text, ranges);
    if (problem !== null) return `turn ${turn}, ${problem}`;
  }
  return missingWordsProblem(turns, [...assessment.missingWords.entries()]);
};
