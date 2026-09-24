import type { JSX } from "react";

import { type BandMeterInput, bandMeterGeometry } from "./logic.js";

export type BandMeterProps = {
  /** The band tag's name, e.g. "C-level items". Through i18n. */
  readonly label: string;
  /** The sentence a screen reader hears and everyone reads, e.g. "52% correct, likely 40–64%". */
  readonly valueText: string;
  /** The estimate, or `null` while there is not enough evidence to show one (R10). */
  readonly estimate: BandMeterInput | null;
};

/**
 * One band tag's practice accuracy (product-requirements.md §8.2): a solid bar for
 * the point estimate and a lighter band for its interval, so the uncertainty is on
 * the page and not in a footnote (R10). With no estimate there is no bar at all —
 * only the text, which says how much more evidence is needed. A drawn bar would
 * imply a number the evidence does not support.
 *
 * A native `meter` element is avoided on purpose: its rendering cannot show the
 * interval. `role="meter"` with a value text carries the same semantics.
 */
export const BandMeter = ({ label, valueText, estimate }: BandMeterProps): JSX.Element => {
  if (estimate === null) {
    return (
      <div className="pl-band-meter pl-band-meter--insufficient">
        <span className="pl-band-meter__label">{label}</span>
        <span className="pl-band-meter__text">{valueText}</span>
      </div>
    );
  }
  const geo = bandMeterGeometry(estimate);
  const range = { left: `${geo.rangeStartPercent}%`, width: `${geo.rangeWidthPercent}%` };
  const fill = { width: `${geo.fillPercent}%` };
  const ariaValueMin = 0;
  const ariaValueMax = 100;
  return (
    <div className="pl-band-meter">
      <span className="pl-band-meter__label">{label}</span>
      <div
        className="pl-band-meter__track"
        role="meter"
        aria-label={label}
        aria-valuenow={geo.valueNow}
        aria-valuemin={ariaValueMin}
        aria-valuemax={ariaValueMax}
        aria-valuetext={valueText}
      >
        <div className="pl-band-meter__range" style={range} />
        <div className="pl-band-meter__fill" style={fill} />
      </div>
      <span className="pl-band-meter__text" aria-hidden="true">
        {valueText}
      </span>
    </div>
  );
};
