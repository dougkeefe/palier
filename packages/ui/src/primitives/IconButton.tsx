import type { ButtonHTMLAttributes, JSX, Ref } from "react";

import { Glyph } from "./Glyph.js";
import type { GlyphName } from "./logic.js";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label" | "title"> & {
  /** What the button does, in words through i18n: its accessible name and its tooltip, since the glyph says nothing. */
  readonly label: string;
  readonly glyph: GlyphName;
  readonly ref?: Ref<HTMLButtonElement>;
};

/**
 * A button that is a glyph alone (progress.md D251), such as copy on the translator's French. The
 * glyph is `aria-hidden`, so `label` is required and is both the accessible name and the tooltip.
 * `type` defaults to `button`, as `Button`'s does.
 */
export const IconButton = ({ label, glyph, className, type = "button", ...rest }: IconButtonProps): JSX.Element => (
  <button
    className={className === undefined ? "pl-icon-btn" : `pl-icon-btn ${className}`}
    type={type}
    aria-label={label}
    title={label}
    {...rest}
  >
    <Glyph name={glyph} />
  </button>
);
