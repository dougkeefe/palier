import type { JSX } from "react";

import { streakFlameClass } from "./logic.js";

export type StreakFlameProps = {
  /** Today is done: the flame is lit, and settles in once (§10.5's "streak flame on completion"). */
  readonly lit: boolean;
};

/**
 * The streak's flame (product-requirements.md §9, §10.4), in the decorative `accent` token. It is
 * `aria-hidden`: the count beside it is text, and says everything the flame does. Unlit, it is an
 * outline in `ink-muted`, never a warning: a streak not yet extended today is not a loss (§9's
 * "no anxiety").
 */
export const StreakFlame = ({ lit }: StreakFlameProps): JSX.Element => (
  <svg className={streakFlameClass(lit)} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <path
      d="M12 2 C13 7 18 9 18 15 A6 6 0 0 1 6 15 C6 11.5 8 10 9 7.5 C10 10 11.5 10.5 12 9 C12.5 7 12 4.5 12 2 Z"
      fill={lit ? "var(--accent)" : "none"}
      stroke={lit ? "var(--accent)" : "var(--ink-muted)"}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);
