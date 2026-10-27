import type { Band, TargetBand } from "@palier/domain";

/**
 * The choices the study profile's level pickers offer (progress.md D259), shared by onboarding and
 * the study settings so the two never drift.
 */

/** The targets offered: onboarding's B or C (§8.1 step 2), per skill when a position's profile differs. */
export const TARGET_CHOICES: readonly TargetBand[] = ["B", "C"];

/**
 * What a skill's staircase says, under it as the picker's caption (D259, D263), as a message key in `levels`: the result held and
 * the target, or only the target with none declared, or the exemption. It is the user's word,
 * never a measure, so every sentence says "you hold".
 */
export const stairMessage = (current: Band | null, exemptBand: Band): "stairNone" | "stairHeld" | "stairExempt" =>
  current === null ? "stairNone" : current === exemptBand ? "stairExempt" : "stairHeld";
