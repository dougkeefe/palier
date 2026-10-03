import type { JSX } from "react";

import { type BandMeterInput, TREND_CHART_HEIGHT, TREND_CHART_WIDTH, trendChartGeometry } from "./logic.js";

export type TrendChartProps = {
  /** One estimate per week, oldest first; `null` for a week with too little evidence to show one (R10). */
  readonly points: readonly (BandMeterInput | null)[];
  /** The first and last week's names under the chart, e.g. "13 Jul" and "3 Oct". Through i18n. */
  readonly startLabel: string;
  readonly endLabel: string;
};

/**
 * The band trend over time (product-requirements.md §8.9, progress.md D198): one line for the
 * estimate, its interval a shaded region around it, and a gap, never a bridge, where a week had
 * too little evidence (R10). Nothing moves (§10.5 keeps motion for moments).
 *
 * **It is `aria-hidden`.** A line is a picture of figures, and the figures belong in a table, which
 * the screen places beside it. So the chart is never the only place a number is.
 */
export const TrendChart = ({ points, startLabel, endLabel }: TrendChartProps): JSX.Element => {
  const geo = trendChartGeometry(points);
  return (
    <div className="pl-trend-chart" aria-hidden="true">
      <svg
        className="pl-trend-chart__plot"
        viewBox={`0 0 ${String(TREND_CHART_WIDTH)} ${String(TREND_CHART_HEIGHT)}`}
        focusable="false"
      >
        {geo.guides.map((y) => (
          <line key={y} className="pl-trend-chart__guide" x1={0} x2={TREND_CHART_WIDTH} y1={y} y2={y} />
        ))}
        {geo.runs.map((run) => (
          <g key={run.line}>
            <polygon className="pl-trend-chart__interval" points={run.area} />
            <polyline className="pl-trend-chart__line" points={run.line} />
          </g>
        ))}
        {geo.dots.map((dot) => (
          <circle key={`${String(dot.x)},${String(dot.y)}`} className="pl-trend-chart__dot" cx={dot.x} cy={dot.y} r={2.5} />
        ))}
      </svg>
      <div className="pl-trend-chart__axis">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
};
