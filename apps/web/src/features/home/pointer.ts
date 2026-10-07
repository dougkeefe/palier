import type { Pointer, ScoredSkill, SubSkill } from "@palier/domain";
import { subSkillsFor } from "@palier/domain";

/**
 * Today's quick pointer (progress.md D216): one of the committed pointers, chosen the same way all
 * day and a different one the next. It favours what the plan favours, the focus `studyFocus` reads
 * (the diagnostic's weakest sub-skills, after an oral report's fixes), at the skill being looked
 * at. With no focus there, any sub-skill of that skill. `null` only if the set has none for the skill,
 * which `parsePointersOrThrow` makes impossible for the committed one.
 */
export type PointerRequest = {
  readonly skill: ScoredSkill;
  readonly focusSubSkills: readonly SubSkill[];
  /** The device's local day, `YYYY-MM-DD` (the engine's `localDay`), which turns the pointer over. */
  readonly day: string;
};

const DAY_MS = 86_400_000;

export const pickPointer = (pointers: readonly Pointer[], request: PointerRequest): Pointer | null => {
  const ofSkill: readonly SubSkill[] = subSkillsFor(request.skill);
  const focus = request.focusSubSkills.filter((subSkill) => ofSkill.includes(subSkill));
  const pool = focus.length > 0 ? focus : ofSkill;
  const candidates = pointers.filter((pointer) => pool.includes(pointer.subSkill));
  if (candidates.length === 0) return null;
  const dayNumber = Math.floor(Date.parse(`${request.day}T00:00:00.000Z`) / DAY_MS);
  return candidates[dayNumber % candidates.length] ?? null;
};
