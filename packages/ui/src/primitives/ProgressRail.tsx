import type { JSX } from "react";

import { railGeometry } from "./logic.js";

export type ProgressRailProps = {
  readonly current: number;
  readonly total: number;
  /** Accessible name, supplied through i18n. */
  readonly label: string;
};

/** A progress bar whose fill width is `railGeometry`'s clamped percentage. */
export const ProgressRail = ({ current, total, label }: ProgressRailProps): JSX.Element => {
  const geo = railGeometry(current, total);
  const fillStyle = { width: `${geo.percent}%` };
  const ariaValueMin = 0;
  return (
    <div
      className="pl-rail"
      role="progressbar"
      aria-label={label}
      aria-valuenow={geo.valueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={geo.valueMax}
    >
      <div className="pl-rail__fill" style={fillStyle} />
    </div>
  );
};
