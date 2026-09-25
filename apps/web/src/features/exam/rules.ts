import type { ExamForm, ExamProfile, ExamVariant, Lang } from "@palier/domain";
import type { TimerTone } from "@palier/ui";

/**
 * The mock-exam runner's product rules (product-requirements.md §8.4, progress.md
 * D84). These numbers are Palier's choices about how the runner behaves, **not
 * exam rules**: the PSC's counts, time limits and cuts stay in the profile (ADR 9),
 * and every function here that needs one reads it from the form or the variant.
 */

/** The extra-time option multiplies the form's limit (D84, ruling 3). */
export const EXTRA_TIME = 1.5;

/** The clock turns amber at ten minutes left and red at two (§8.4). */
export const AMBER_MS = 10 * 60_000;
export const RED_MS = 2 * 60_000;

/**
 * How often the runner writes the elapsed time with nothing else changing. Every
 * answer and flag is already a checkpoint, and so is hiding the tab, so this only
 * bounds what a crash can lose: at most this much exam time (progress.md D87).
 */
export const CHECKPOINT_EVERY_MS = 10_000;

/** §8.4: "on submit, a short deliberate pause and then the results screen". */
export const SUBMIT_PAUSE_MS = 800;

/** The run's time limit in milliseconds, with its allowance. */
export const limitMs = (form: ExamForm, allowance = 1): number => form.timeLimitMinutes * 60_000 * allowance;

/** Time left, never negative. */
export const remainingMs = (limit: number, elapsed: number): number => Math.max(0, limit - elapsed);

export const expired = (remaining: number): boolean => remaining <= 0;

export const clockTone = (remaining: number): TimerTone =>
  remaining <= RED_MS ? "urgent" : remaining <= AMBER_MS ? "warning" : "normal";

/**
 * The visible clock, minutes and seconds, "90:00" down to "0:00". It rounds up, so
 * it shows "0:00" only once time has actually run out.
 */
export const clockText = (remaining: number): string => {
  const seconds = Math.ceil(Math.max(0, remaining) / 1000);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
};

/**
 * Whole minutes left, rounded up. The polite live region is updated when this
 * changes and at no other time, which is §11's "polite update at one-minute
 * intervals rather than every second".
 */
export const announcedMinutes = (remaining: number): number => Math.ceil(Math.max(0, remaining) / 60_000);

/** Whether enough exam time has passed since the last write to checkpoint again. */
export const checkpointDue = (lastWrittenElapsed: number, elapsed: number): boolean =>
  elapsed - lastWrittenElapsed >= CHECKPOINT_EVERY_MS;

export type VariantChoice = {
  /** The profile's name for the variant, such as `reading-supervised`. */
  readonly name: string;
  readonly variant: ExamVariant;
  /** The bank's form for it, or null when this bank ships none. */
  readonly form: ExamForm | null;
};

/**
 * Pair each profile variant with the bank's form for it, in the profile's order
 * (ADR 9: the picker lists what the profile defines, not what code expects). A form
 * matches on skill, mode and language; of two, the higher version wins, since a
 * later bank's form is the current one (D82). A variant with no form reads as
 * unavailable rather than disappearing.
 */
export const variantChoices = (profile: ExamProfile, forms: readonly ExamForm[], lang: Lang): readonly VariantChoice[] =>
  Object.entries(profile.variants).map(([name, variant]) => {
    const matching = forms
      .filter((f) => f.skill === variant.skill && f.mode === variant.mode && f.lang === lang)
      .sort((a, b) => b.version - a.version || (a.id < b.id ? -1 : 1));
    return { name, variant, form: matching[0] ?? null };
  });
