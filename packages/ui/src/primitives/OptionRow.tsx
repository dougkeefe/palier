import type { JSX, ReactNode } from "react";

import { Glyph } from "./Glyph.js";
import { type OptionOutcome, optionRowState } from "./logic.js";

export type OptionRowProps = {
  readonly selected: boolean;
  /** Present once the answer is revealed. */
  readonly outcome?: OptionOutcome;
  readonly disabled?: boolean;
  /** Roving-tabindex focus target within the radio group. Defaults to focusable. */
  readonly active?: boolean;
  /** The correct/incorrect label, supplied through i18n so the glyph is not the only signal. */
  readonly statusLabel?: string;
  readonly onSelect?: () => void;
  readonly children: ReactNode;
};

/**
 * A single drill answer. A real `radio` inside the group's `radiogroup`
 * (product-requirements.md §11). Selection is by click or, natively, Space and
 * Enter; arrow-key roving is the group's concern (see `optionRowKeydown`).
 */
export const OptionRow = ({
  selected,
  outcome,
  disabled = false,
  active = true,
  statusLabel,
  onSelect,
  children,
}: OptionRowProps): JSX.Element => {
  const state = optionRowState(
    outcome === undefined ? { selected, disabled } : { selected, outcome, disabled },
  );
  const tabIndex = active ? 0 : -1;
  return (
    <button
      type="button"
      role="radio"
      className={state.className}
      aria-checked={state.ariaChecked}
      aria-disabled={state.ariaDisabled}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onSelect}
    >
      {state.glyph === null ? null : <Glyph name={state.glyph} className="pl-option__glyph" />}
      <span className="pl-option__label">{children}</span>
      {statusLabel === undefined ? null : <span className="pl-option__status">{statusLabel}</span>}
    </button>
  );
};
