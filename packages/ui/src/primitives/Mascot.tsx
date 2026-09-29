import type { JSX } from "react";

import { type MascotPose, mascotClass } from "./logic.js";

export type MascotProps = {
  /** `asleep` on an empty state (§14: "Coco asleep"), `cheer` on a milestone moment (§9). */
  readonly pose?: MascotPose;
};

/**
 * Coco the parrot (product-requirements.md §10.1): a static shape in the brand tokens, drawn
 * with presentation attributes only, so the strict CSP's `style-src` has nothing to refuse.
 * Asleep on the empty review queue; cheering, wings up, on a milestone moment, where it settles
 * in with §10.5's small spring (`pl-celebrate`, off under reduced motion).
 *
 * Decorative: `aria-hidden`, because the surrounding words carry the meaning. It never appears
 * in exam mode or on results (§10.1).
 */
export const Mascot = ({ pose = "asleep" }: MascotProps): JSX.Element => (
  <svg className={mascotClass(pose)} viewBox="0 0 96 96" width="96" height="96" aria-hidden="true" focusable="false">
    {pose === "cheer" ? (
      <>
        {/* Wings raised. */}
        <path d="M24 58 q-16 -10 -14 -30 q12 8 18 22 z" fill="var(--accent)" />
        <path d="M72 58 q16 -10 14 -30 q-12 8 -18 22 z" fill="var(--accent)" />
      </>
    ) : null}
    <ellipse cx="48" cy="60" rx="26" ry="24" fill="var(--primary)" />
    <circle cx="48" cy="34" r="20" fill="var(--primary)" />
    <path d="M60 34 q14 2 12 14 q-8 -6 -14 -6 z" fill="var(--accent)" />
    {pose === "cheer" ? (
      <>
        {/* Eyes open, and a wide smile on the chest. */}
        <circle cx="42" cy="30" r="4" fill="var(--surface)" />
        <circle cx="43" cy="30" r="2" fill="var(--ink)" />
        <path d="M32 60 q16 16 32 0" stroke="var(--surface)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M38 32 q5 4 10 0" stroke="var(--surface)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M30 64 q18 14 36 0" stroke="var(--surface)" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* The sleeping "z"s, drawn rather than typed: they are decoration, not text. */}
        <path d="M68 10 h10 l-10 12 h10" stroke="var(--ink-muted)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        <path d="M82 2 h7 l-7 8 h7" stroke="var(--ink-muted)" strokeWidth="2" fill="none" strokeLinejoin="round" />
      </>
    )}
  </svg>
);
