import type { Clock } from "@palier/app";

/**
 * The production `Clock`: the wall clock, as an ISO-8601 UTC string.
 *
 * This is the one place in the app allowed to read `Date` — use cases receive a
 * `Clock` port and never call it themselves (@palier/app CLAUDE.md). It lives beside
 * the composition root rather than in `@palier/adapters` because it is one line, has
 * no vendor behind it, and has exactly one consumer; promote it to an
 * `@palier/adapters/clock` subpath the day a second entry point needs it
 * (progress.md D58).
 */
export const systemClock = (now: () => Date = () => new Date()): Clock => ({
  now: () => now().toISOString(),
});

/**
 * The seed for the production selection `Random`, derived from the calendar day of
 * `iso` (its `YYYY-MM-DD` prefix, UTC).
 *
 * `Random` is the *selection* randomness (ADR 7) and is seeded by design
 * (implementation-plan.md §3.5), but §3.5 leaves the production seed unstated. A
 * per-day seed makes a reload replay today's plan exactly rather than reshuffling it
 * under the user, while each new day still draws a fresh order (progress.md D58). It
 * is never an entropy source: identifiers come from `@palier/adapters/ids`.
 *
 * FNV-1a over the date string — deterministic, dependency-free, and spreads adjacent
 * days across the 32-bit range.
 */
export const selectionSeedFor = (iso: string): number => {
  const day = iso.slice(0, 10);
  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
