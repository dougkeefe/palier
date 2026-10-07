import type { JSX } from "react";

import type { GlyphName } from "./logic.js";

/**
 * The decorative glyphs that accompany a state so colour is never the only
 * signal (product-requirements.md §10.2), and the skill and navigation marks on
 * Today (progress.md D219). Always `aria-hidden`: the meaning is carried by an
 * adjacent text label the caller supplies through i18n, never by the icon alone.
 */
export type GlyphProps = {
  readonly name: GlyphName;
  readonly className?: string;
};

/** Each glyph's strokes on a 24-unit grid. A new glyph is an entry here (principle 6). */
export const GLYPH_PATHS: Readonly<Record<GlyphName, JSX.Element>> = {
  check: <path d="M20 6 9 17l-5-5" />,
  cross: <path d="M18 6 6 18M6 6l12 12" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  star: <path d="M12 3l2.9 5.9 6.1.9-4.5 4.4 1.1 6.3L12 17.9 6.4 20.9l1.1-6.3L3 10.7l6.1-.9z" />,
  book: (
    <>
      <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2z" />
      <path d="M12 6.5v13" />
    </>
  ),
  pen: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="M14.5 5.5l3 3" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
};

export const Glyph = ({ name, className }: GlyphProps): JSX.Element => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {GLYPH_PATHS[name]}
  </svg>
);
