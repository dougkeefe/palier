import type { ExamProfile } from "@palier/domain";
import { leitnerIntervalDays } from "@palier/domain";

/**
 * Leitner review scheduling (architecture.md §7.3). Five boxes, one rule:
 * correct moves up one, incorrect resets to box 1, and a correct answer that was
 * slow or where the user changed their mind holds its box rather than advancing.
 * The top box is retirement — it never schedules again.
 *
 * "The four intervals are values in the exam profile, not constants in code, so
 * they can be retuned from usage data without a release." (ADR 8) The number of
 * boxes follows from that: one review box per interval, plus retirement, so it is
 * derived from the profile too rather than hard-coded to five.
 *
 * `now` is a plain ISO-8601 string, not a `Clock` (progress.md D32); the day
 * arithmetic is exact, so midnight in gives midnight out.
 */

export type ReviewGrade = {
  readonly correct: boolean;
  /** The user changed their answer before confirming: a correct-but-shaky signal. */
  readonly changedAnswer: boolean;
  /**
   * Answered correctly but slowly. The timing-to-slow threshold is a product
   * tuning decision the caller owns, so it arrives as a boolean rather than a
   * duration — the scheduler only knows the Leitner rule (D28's minimalism).
   */
  readonly slow: boolean;
};

export type Review = {
  /** The Leitner box the item now sits in, 1 to the retirement box. */
  readonly box: number;
  /** When the item is next due, or `null` once it has retired from the queue. */
  readonly due: string | null;
};

/** The retirement box: one past the last review interval the profile defines. */
export const retirementBox = (profile: ExamProfile): number =>
  profile.leitnerIntervalDays.length + 1;

const addDays = (now: string, days: number): string =>
  new Date(new Date(now).getTime() + days * 86_400_000).toISOString();

const nextBox = (currentBox: number, grade: ReviewGrade, retirement: number): number => {
  if (!grade.correct) return 1;
  if (grade.changedAnswer || grade.slow) return currentBox;
  return Math.min(currentBox + 1, retirement);
};

export const scheduleReview = (
  profile: ExamProfile,
  currentBox: number,
  grade: ReviewGrade,
  now: string,
): Review => {
  const retirement = retirementBox(profile);
  if (!Number.isInteger(currentBox) || currentBox < 1 || currentBox > retirement) {
    throw new RangeError(
      `A Leitner box is an integer from 1 to ${retirement} (the retirement box); got ${currentBox}.`,
    );
  }

  const box = nextBox(currentBox, grade, retirement);
  // Null at retirement, a positive interval for every review box (ADR 8).
  const days = leitnerIntervalDays(profile, box);
  return { box, due: days === null ? null : addDays(now, days) };
};
