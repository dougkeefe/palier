import type { Band, TargetBand } from "@palier/domain";

/**
 * The choices the study profile's level pickers offer (progress.md D259), shared by onboarding and
 * the study settings so the two never drift.
 */

/** The targets offered: onboarding's B or C (§8.1 step 2), per skill when a position's profile differs. */
export const TARGET_CHOICES: readonly TargetBand[] = ["B", "C"];

/** A result picker's choices: "not yet", then every band the profile names, lowest first. */
export const resultChoices = (bands: readonly Band[]): readonly (Band | null)[] => [null, ...bands];

/** A result choice's value in the form, since a radio's value is a string: "none" for not yet. */
export const resultValue = (band: Band | null): string => band ?? "none";

/**
 * What the staircase beside a picker says (D259), as a message key in `levels`: the result held and
 * the target, or only the target with none declared, or the exemption. It is the user's word,
 * never a measure, so every sentence says "you hold".
 */
export const stairMessage = (current: Band | null, exemptBand: Band): "stairNone" | "stairHeld" | "stairExempt" =>
  current === null ? "stairNone" : current === exemptBand ? "stairExempt" : "stairHeld";
