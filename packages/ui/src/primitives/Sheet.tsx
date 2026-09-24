"use client";

import { type JSX, type ReactNode, type Ref, useId } from "react";

import { Glyph } from "./Glyph.js";
import { type SheetTone, sheetState } from "./logic.js";

export type SheetProps = {
  readonly tone: SheetTone;
  readonly heading: string;
  /**
   * The heading receives focus when the sheet opens (§11: "focus moves to the
   * feedback panel heading on answer"), so it takes a ref and is focusable.
   */
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly children: ReactNode;
  /** The sheet's primary action, bottom-anchored within thumb reach (§10.4). */
  readonly action?: ReactNode;
};

/**
 * The panel that slides up after an answer (product-requirements.md §8.3). A labelled
 * region, not a dialog: the item stays readable beside it, nothing behind it is inert,
 * and focus moves to its heading rather than being trapped. The tone carries a glyph
 * as well as a colour (§10.2).
 */
export const Sheet = ({ tone, heading, headingRef, children, action }: SheetProps): JSX.Element => {
  const headingId = useId();
  const state = sheetState(tone);
  return (
    <section className={state.className} aria-labelledby={headingId}>
      <h2 id={headingId} className="pl-sheet__heading" ref={headingRef} tabIndex={-1}>
        {state.glyph === null ? null : <Glyph name={state.glyph} className="pl-sheet__glyph" />}
        {heading}
      </h2>
      <div className="pl-sheet__body">{children}</div>
      {action === undefined ? null : <div className="pl-sheet__action">{action}</div>}
    </section>
  );
};
