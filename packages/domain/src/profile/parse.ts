import * as z from "zod";

import type { ExamProfile, ExamVariant } from "./exam-profile.js";
import { examProfileSchema } from "./schema.js";
import type { Band } from "../bands.js";
import { bandRank } from "../bands.js";

/**
 * Parses an **already-read** value into an `ExamProfile`.
 *
 * It does not read a file and it is not async, because `@palier/domain` does no
 * I/O (implementation-plan.md 3.2). Reading `content/profiles/psc-sle.json`
 * belongs to an adapter or a build step; this is the validation half, and it is
 * the half that has to be pure so the engine can depend on it.
 */

export type ProfileParseResult =
  | { readonly ok: true; readonly profile: ExamProfile }
  | { readonly ok: false; readonly errors: readonly string[] };

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

export const parseExamProfile = (value: unknown): ProfileParseResult => {
  const result = examProfileSchema.safeParse(value);

  if (!result.success) {
    return { ok: false, errors: result.error.issues.map(formatIssue) };
  }

  return { ok: true, profile: result.data as ExamProfile };
};

/**
 * The throwing form, for a build step or a test where a malformed profile is
 * not a recoverable condition. The message lists every problem rather than the
 * first, because fixing cut tables one error per run is miserable.
 */
export const parseExamProfileOrThrow = (value: unknown): ExamProfile => {
  const result = parseExamProfile(value);
  if (!result.ok) {
    throw new Error(
      `The exam profile is not valid:\n  ${result.errors.join("\n  ")}`,
    );
  }
  return result.profile;
};

/** The variant names a profile declares, in declaration order. */
export const variantNames = (profile: ExamProfile): readonly string[] =>
  Object.keys(profile.variants);

export const variant = (profile: ExamProfile, name: string): ExamVariant | null =>
  profile.variants[name] ?? null;

/** The bands a variant actually uses, lowest to highest. */
export const bandsFor = (examVariant: ExamVariant): readonly Band[] =>
  orderedCuts(examVariant).map((rung) => rung.band);

export type OrderedCut = {
  readonly band: Band;
  readonly min: number;
  readonly max: number;
};

/**
 * A variant's cut table as a ladder, lowest band first.
 *
 * `cuts` is a `Partial<Record<Band, ...>>` because no variant awards every
 * band, so reading it by key hands the caller an `undefined` it has to narrow
 * away. Doing that once, here, keeps the narrowing out of the engine — where it
 * would be an unreachable branch that no test could honestly cover.
 */
export const orderedCuts = (examVariant: ExamVariant): readonly OrderedCut[] =>
  (Object.entries(examVariant.cuts) as [Band, readonly [number, number]][])
    .map(([band, [min, max]]) => ({ band, min, max }))
    .sort((a, b) => bandRank(a.band) - bandRank(b.band));

/** The review interval in days for a Leitner box. Box 5 is retirement (ADR 8). */
export const leitnerIntervalDays = (
  profile: ExamProfile,
  box: number,
): number | null => profile.leitnerIntervalDays[box - 1] ?? null;
