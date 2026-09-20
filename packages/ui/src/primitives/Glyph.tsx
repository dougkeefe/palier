import type { JSX } from "react";

import type { GlyphName } from "./logic.js";

/**
 * The decorative glyphs that accompany a state so colour is never the only
 * signal (product-requirements.md §10.2). Always `aria-hidden`: the meaning is
 * carried by an adjacent text label the caller supplies through i18n, never by
 * the icon alone.
 */
export type GlyphProps = {
  readonly name: GlyphName;
  readonly className?: string;
};

const paths = (name: GlyphName): JSX.Element => {
  switch (name) {
    case "check":
      return <path d="M20 6 9 17l-5-5" />;
    case "cross":
      return <path d="M18 6 6 18M6 6l12 12" />;
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.5h.01" />
        </>
      );
    case "star":
      return <path d="M12 3l2.9 5.9 6.1.9-4.5 4.4 1.1 6.3L12 17.9 6.4 20.9l1.1-6.3L3 10.7l6.1-.9z" />;
  }
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
    {paths(name)}
  </svg>
);
