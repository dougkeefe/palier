import type { JSX, ReactNode } from "react";

import { Glyph } from "./Glyph.js";
import { type CalloutTone, calloutState } from "./logic.js";

export type CalloutProps = {
  readonly tone: CalloutTone;
  readonly children: ReactNode;
};

/** An inline note keyed to a tone, each with its own glyph (never colour alone). */
export const Callout = ({ tone, children }: CalloutProps): JSX.Element => {
  const state = calloutState(tone);
  return (
    <div className={state.className}>
      <Glyph name={state.glyph} className="pl-callout__glyph" />
      <div className="pl-callout__body">{children}</div>
    </div>
  );
};
