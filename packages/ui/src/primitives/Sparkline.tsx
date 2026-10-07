import type { JSX } from "react";

import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklineGeometry } from "./logic.js";

export type SparklineProps = {
  /** One value per period, oldest first. */
  readonly values: readonly number[];
};

/**
 * A small line of recent values with a soft fill beneath (progress.md D219): Today's minutes this
 * week. **It is `aria-hidden`**, like `TrendChart`: the caller states the figure it summarises in
 * text beside it, so the line is never the only place a number is. Nothing moves.
 */
export const Sparkline = ({ values }: SparklineProps): JSX.Element => {
  const geo = sparklineGeometry(values);
  return (
    <svg
      className="pl-sparkline"
      viewBox={`0 0 ${String(SPARKLINE_WIDTH)} ${String(SPARKLINE_HEIGHT)}`}
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      <polygon className="pl-sparkline__area" points={geo.area} />
      <polyline className="pl-sparkline__line" points={geo.line} />
    </svg>
  );
};
