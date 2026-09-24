import type { JSX, ReactNode } from "react";

import { Glyph } from "./Glyph.js";
import { type CalloutTone, calloutState } from "./logic.js";

export type ToastProps = {
  readonly tone: CalloutTone;
  readonly children: ReactNode;
};

/**
 * The result of an action the user just took — an import's counts, a report filed
 * (product-requirements.md §14). A polite live region, so a screen reader hears it
 * without losing its place.
 *
 * It does **not** dismiss itself: a message that vanishes on a timer is a WCAG 2.2.1
 * timing problem, and the next action replaces it anyway.
 */
export const Toast = ({ tone, children }: ToastProps): JSX.Element => {
  const state = calloutState(tone);
  return (
    <div className={`${state.className} pl-toast`} role="status" aria-live="polite">
      <Glyph name={state.glyph} className="pl-callout__glyph" />
      <div className="pl-callout__body">{children}</div>
    </div>
  );
};
