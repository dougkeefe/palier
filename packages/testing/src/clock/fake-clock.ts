import type { Clock, ISO } from "@palier/app";

/**
 * A `Clock` a test controls, because the engine takes one as a parameter rather
 * than calling `Date.now()` (architecture.md 7, ADR 8), and because
 * implementation-plan.md 6.4 requires that no test read the system clock.
 *
 * Time is held as epoch milliseconds and rendered as an ISO 8601 string, which
 * is the `ISO` the ports in 3.3 pass around. `Clock` and `ISO` are the port
 * definitions from `@palier/app`; re-exported here so a test importing the fake
 * gets the type alongside it.
 */
export type { Clock, ISO };

export type FakeClock = Clock & {
  /** Move time forward. Rejects a negative duration: time does not run backwards. */
  advance: (milliseconds: number) => void;
  /** Jump to an instant, for setting up a scenario rather than stepping through one. */
  set: (instant: ISO) => void;
};

export const fakeClock = (start: ISO = "2026-01-01T00:00:00.000Z"): FakeClock => {
  let epochMs = Date.parse(start);
  if (Number.isNaN(epochMs)) {
    throw new TypeError(`fakeClock needs a parseable ISO 8601 instant, got ${start}`);
  }

  return {
    now: () => new Date(epochMs).toISOString(),
    advance: (milliseconds) => {
      if (milliseconds < 0) {
        throw new RangeError(
          `fakeClock.advance does not run time backwards, got ${milliseconds}`,
        );
      }
      epochMs += milliseconds;
    },
    set: (instant) => {
      const parsed = Date.parse(instant);
      if (Number.isNaN(parsed)) {
        throw new TypeError(
          `fakeClock.set needs a parseable ISO 8601 instant, got ${instant}`,
        );
      }
      epochMs = parsed;
    },
  };
};
