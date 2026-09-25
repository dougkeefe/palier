import type { JSX } from "react";

import { Glyph } from "./Glyph.js";
import { type TimerTone, timerState } from "./logic.js";

export type TimerProps = {
  /** What the clock is, for assistive technology: "Time left". */
  readonly label: string;
  /** The visible time, such as "42:07". It changes every second and is not announced. */
  readonly text: string;
  readonly tone: TimerTone;
  /** The tone in words, such as "Less than 10 minutes left", shown beside the glyph. */
  readonly toneLabel?: string;
  /**
   * The polite live announcement, such as "42 minutes left". The caller changes it
   * once a minute, so a screen reader hears the time without a second-by-second
   * stream (product-requirements.md §11).
   */
  readonly announcement: string;
};

/**
 * The exam clock (§8.4). Presentation only: the time, the tone and the words for
 * both arrive decided. The tone carries a glyph and a label as well as a colour
 * (§10.2), and nothing moves (§8.4: "no animation").
 */
export const Timer = ({ label, text, tone, toneLabel, announcement }: TimerProps): JSX.Element => {
  const state = timerState(tone);
  return (
    <div className={state.className} role="group" aria-label={label}>
      {state.glyph === null ? null : <Glyph name={state.glyph} className="pl-timer__glyph" />}
      <span className="pl-timer__time">{text}</span>
      {toneLabel === undefined ? null : <span className="pl-timer__tone">{toneLabel}</span>}
      <span className="pl-visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
};
