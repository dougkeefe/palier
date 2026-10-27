import type { Band } from "@palier/domain";
import type { CSSProperties, JSX } from "react";

import { StairDrawing, StairStamp } from "./LevelStair.js";
import { LEVEL_STAIR_PICK_GROUND, type LevelStairHit, levelStairGeometry } from "./logic.js";

export type LevelStairPickerProps = {
  /** The profile's bands, lowest first: one step, and one choice, each. */
  readonly bands: readonly Band[];
  /** The result chosen, or null for "Not yet". */
  readonly current: Band | null;
  readonly target: Band;
  /** The group's name, e.g. the skill: what a screen reader announces on entering it. */
  readonly legend: string;
  /** The radios' shared `name`, unique on the page. */
  readonly name: string;
  /** The ground's choice, written under it: "Not yet". */
  readonly notYetLabel: string;
  /** The sentence under the stair, saying what is chosen, e.g. "Reading: you hold C. Your target is C." */
  readonly caption: string;
  /** The rubber stamp's word, pressed on when present: the caller's exemption. */
  readonly stamp?: string;
  readonly onChange: (band: Band | null) => void;
};

/** A hit box's place over the drawing, as the stylesheet reads it. */
const hitStyle = ({ left, width, top }: LevelStairHit): CSSProperties =>
  ({ insetInlineStart: `${left}%`, inlineSize: `${width}%`, "--pl-step-top": `${top}%` }) as CSSProperties;

/**
 * The staircase as the control (progress.md D263): a skill's result is picked by tapping its step,
 * and Coco hops there. Each step's whole column is a label over the drawing, covered by a real,
 * transparent radio named by the band, so a pointer lands on the control itself, the arrow keys walk
 * Coco up and down the stair, and a screen reader hears "radio, C, 5 of 6". The ground before the first step is "Not yet".
 *
 * The drawing is hidden from assistive technology; the radios and the caption say what it shows.
 * The caption is not live, since the checked radio is already announced.
 */
export const LevelStairPicker = ({
  bands,
  current,
  target,
  legend,
  name,
  notYetLabel,
  caption,
  stamp,
  onChange,
}: LevelStairPickerProps): JSX.Element => {
  const geo = levelStairGeometry({ bands, current, target, ground: LEVEL_STAIR_PICK_GROUND });
  return (
    <fieldset className="pl-level-stair pl-level-stair--pick">
      <legend className="pl-level-stair__legend">{legend}</legend>
      <div className="pl-level-stair__stage">
        <StairDrawing geo={geo} hop={current ?? ""} />
        <label className="pl-level-stair__hit pl-level-stair__hit--ground" style={hitStyle(geo.groundHit)}>
          <input
            type="radio"
            className="pl-level-stair__radio"
            name={name}
            value=""
            checked={current === null}
            onChange={() => onChange(null)}
          />
          <span className="pl-level-stair__ground-word">{notYetLabel}</span>
        </label>
        {geo.steps.map((step) => (
          <label key={step.band} className="pl-level-stair__hit" style={hitStyle(step.hit)}>
            <input
              type="radio"
              className="pl-level-stair__radio"
              name={name}
              value={step.band}
              checked={current === step.band}
              onChange={() => onChange(step.band)}
            />
            <span className="pl-visually-hidden">{step.band}</span>
          </label>
        ))}
        {stamp === undefined ? null : <StairStamp word={stamp} />}
      </div>
      <p className="pl-level-stair__caption">{caption}</p>
    </fieldset>
  );
};
