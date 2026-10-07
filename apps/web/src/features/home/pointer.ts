import type { Pointer, SubSkill } from "@palier/domain";

/**
 * Today's quick grammar pointer (progress.md D216, D218): one of the committed pointers, the same
 * all day and a different one the next, whichever skill the page is showing. It favours the grammar
 * points the writing plan favours (`studyFocus` at writing: the writing diagnostic's weakest
 * sub-skills, after an oral report's fixes), and draws from them all when none is a grammar point.
 * `null` only for an empty set, which `parsePointersOrThrow` makes impossible for the committed one.
 */
export type PointerRequest = {
  readonly focusSubSkills: readonly SubSkill[];
  /** The device's local day, `YYYY-MM-DD` (the engine's `localDay`), which turns the pointer over. */
  readonly day: string;
};

const DAY_MS = 86_400_000;

export const pickPointer = (pointers: readonly Pointer[], request: PointerRequest): Pointer | null => {
  const focused = pointers.filter((pointer) => request.focusSubSkills.includes(pointer.subSkill));
  const candidates = focused.length > 0 ? focused : pointers;
  if (candidates.length === 0) return null;
  const dayNumber = Math.floor(Date.parse(`${request.day}T00:00:00.000Z`) / DAY_MS);
  return candidates[dayNumber % candidates.length] ?? null;
};
