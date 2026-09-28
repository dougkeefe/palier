import type {
  MissingWord,
  OralAssessment,
  OralAssessmentDraft,
  OralTurnError,
  OralTurnErrorDraft,
  WritingError,
} from "./ai.js";
import type { OralTurn } from "./oral-session.js";
import { checkErrorOffsets, placeErrors } from "./writing.js";

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

/** Each missing word names a candidate's turn, and quotes words that are in it. */
const missingWordsProblem = (turns: readonly OralTurn[], words: readonly MissingWord[]): string | null => {
  for (const [index, word] of words.entries()) {
    const what = `missing word ${index}`;
    const problem = candidateTurnProblem(turns, word.turn, what);
    if (problem !== null) return problem;
    if (!(turns[word.turn] as OralTurn).text.includes(word.excerpt)) {
      return `${what}: "${word.excerpt}" is not in turn ${word.turn}`;
    }
  }
  return null;
};

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
 * order and then reading order, or the reason it cannot be. A problem is an error or
 * a missing word naming a turn that does not exist or is the examiner's, or an
 * excerpt that is not in its turn, or two errors on the same words.
 */
export const assembleOralAssessment = (
  turns: readonly OralTurn[],
  draft: OralAssessmentDraft,
): AssembleOralResult => {
  for (const [index, error] of draft.errors.entries()) {
    const problem = candidateTurnProblem(turns, error.turn, `error ${index}`);
    if (problem !== null) return { ok: false, problem };
  }
  const placed: OralTurnError[] = [];
  const groups = [...byTurn<OralTurnErrorDraft>(draft.errors)].sort(([a], [b]) => a - b);
  for (const [turn, drafts] of groups) {
    const result = placeErrors((turns[turn] as OralTurn).text, drafts);
    if (!result.ok) return { ok: false, problem: `turn ${turn}, ${result.problem}` };
    placed.push(...result.errors.map((error) => ({ turn, ...error })));
  }
  const problem = missingWordsProblem(turns, draft.missingWords);
  if (problem !== null) return { ok: false, problem };
  return {
    ok: true,
    assessment: {
      criteria: draft.criteria,
      fixes: draft.fixes,
      missingWords: draft.missingWords,
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
  return missingWordsProblem(turns, assessment.missingWords);
};
