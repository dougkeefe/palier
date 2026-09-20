/**
 * The two collaborators every pure computation is given rather than reaching for
 * (implementation-plan.md 3.3, ADR 7, ADR 8): a `Clock` and a `Random`. They are
 * ports like any other, so they live here, not in `@palier/engine`, which only
 * receives them, and not in `@palier/testing`, where `fakeClock` and
 * `seededRandom` merely implement them.
 */

/**
 * An ISO 8601 instant, e.g. `2026-01-01T00:00:00.000Z`. The currency the stores
 * and the `Clock` trade in. A plain `string` alias rather than a branded type:
 * the value crosses to `Date.parse` and to JSON untouched, and nothing in the
 * system constructs one by hand that a schema has not already validated.
 */
export type ISO = string;

/** Time, injected. Production wires the system clock; tests wire `fakeClock`. */
export type Clock = {
  now: () => ISO;
};

/** Randomness, injected and seedable, so a selection is reproducible (ADR 7). */
export type Random = {
  /** A float in [0, 1), like `Math.random`. */
  next: () => number;
};
