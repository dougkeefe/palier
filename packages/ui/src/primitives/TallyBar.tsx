import type { JSX } from "react";

import { type TallyBarInput, tallyBarGeometry } from "./logic.js";

export type TallyBarProps = TallyBarInput;

/**
 * A sub-skill's answers as one bar (progress.md D245): its length the answers given, at the scale of
 * the most practised row beside it, its solid part the right ones and its outlined part the rest.
 * **It is `aria-hidden`**: the caller says "6 of 14 correct" beside it, so the bar is never the only
 * place a count is, and no colour carries a meaning the words do not. Nothing moves.
 */
export const TallyBar = ({ correct, attempted, scale }: TallyBarProps): JSX.Element => {
  const geo = tallyBarGeometry({ correct, attempted, scale });
  const answered = { width: `${geo.answeredPercent}%` };
  const right = { width: `${geo.correctPercent}%` };
  return (
    <div className="pl-tally-bar" aria-hidden="true">
      <div className="pl-tally-bar__answered" style={answered} />
      <div className="pl-tally-bar__correct" style={right} />
    </div>
  );
};
