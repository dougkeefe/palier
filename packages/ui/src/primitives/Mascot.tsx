import type { JSX } from "react";

/**
 * Coco the parrot, asleep (product-requirements.md §10.1, §14: "Coco asleep" on the
 * empty review queue). Deliberately minimal for Slice 1: a static shape in the brand
 * tokens. The full illustrated mascot is later work (progress.md D65).
 *
 * Decorative: `aria-hidden`, because the empty state's own words carry the meaning. It
 * never appears in exam mode or on results (§10.1).
 */
export const Mascot = (): JSX.Element => (
  <svg className="pl-mascot" viewBox="0 0 96 96" width="96" height="96" aria-hidden="true" focusable="false">
    <ellipse cx="48" cy="60" rx="26" ry="24" fill="var(--primary)" />
    <circle cx="48" cy="34" r="20" fill="var(--primary)" />
    <path d="M60 34 q14 2 12 14 q-8 -6 -14 -6 z" fill="var(--accent)" />
    <path d="M38 32 q5 4 10 0" stroke="var(--surface)" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M30 64 q18 14 36 0" stroke="var(--surface)" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* The sleeping "z"s, drawn rather than typed: they are decoration, not text. */}
    <path d="M68 10 h10 l-10 12 h10" stroke="var(--ink-muted)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    <path d="M82 2 h7 l-7 8 h7" stroke="var(--ink-muted)" strokeWidth="2" fill="none" strokeLinejoin="round" />
  </svg>
);
