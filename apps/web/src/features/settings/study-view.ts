import { SKILLS } from "@palier/domain";

import type { StudyProfile } from "../../lib/study";

/**
 * The study settings' decisions (progress.md D259): the page edits a copy of the stored profile and
 * saves it whole, so it needs to know whether the copy differs, and what an emptied date means.
 */

/** Whether the edited profile differs from the one stored, field by field. */
export const changed = (saved: StudyProfile, draft: StudyProfile): boolean =>
  saved.dailyGoalMinutes !== draft.dailyGoalMinutes ||
  saved.testDate !== draft.testDate ||
  SKILLS.some((skill) => saved.targets[skill] !== draft.targets[skill] || saved.current[skill] !== draft.current[skill]);

/** The date field's value as the profile holds it: an emptied field is no test date. */
export const testDateFrom = (value: string): string | null => (value === "" ? null : value);
