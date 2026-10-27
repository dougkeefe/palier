import type { Band } from "@palier/domain";
import type { JSX } from "react";

import { LEVEL_STAIR_HEIGHT, LEVEL_STAIR_STEP_WIDTH, type LevelStairGeometry, levelStairGeometry } from "./logic.js";

export type LevelStairProps = {
  /** The profile's bands, lowest first: one step each. */
  readonly bands: readonly Band[];
  /** The result the user declared, or null with none. */
  readonly current: Band | null;
  readonly target: Band;
  /**
   * The sentence that says what the drawing shows, e.g. "Reading: you hold C. Your target is C."
   * Absent, the stair is decoration beside words that already say it, and hidden entirely.
   */
  readonly label?: string;
  /** The rubber stamp's word, drawn across the stair when present: the caller's exemption. */
  readonly stamp?: string;
  readonly size?: "sm" | "md";
};

/**
 * A skill's declared result as a staircase (progress.md D259; "palier" is a landing): a step per
 * band, solid up to the result, Coco standing on it and a flag on the target. At the exemption the
 * caller passes `stamp`, and an official-looking stamp presses onto the stair once, with the
 * celebration spring (off under reduced motion and in exam mode, like every animation).
 *
 * It is the user's own word, never an estimate (R10, ADR 7): the caller's `label` says "you hold".
 * The drawing and the stamp are hidden from assistive technology, and `label` names the figure; with
 * no label, inside a link or beside a sentence that says the same, the whole of it is hidden.
 */
export const LevelStair = ({ bands, current, target, label, stamp, size = "md" }: LevelStairProps): JSX.Element => (
  <div
    className={`pl-level-stair pl-level-stair--${size}`}
    {...(label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
  >
    <StairDrawing geo={levelStairGeometry({ bands, current, target })} />
    {stamp === undefined ? null : <StairStamp word={stamp} />}
  </div>
);

/**
 * The stair's drawing, shared by `LevelStair` and `LevelStairPicker`, always hidden from assistive
 * technology. Coco is drawn about its feet and moved there by `transform`, so a new result slides it
 * across; given `hop`, which the picker keys by the result, Coco also hops on arriving.
 */
export const StairDrawing = ({ geo, hop }: { geo: LevelStairGeometry; hop?: string }): JSX.Element => (
  <svg className="pl-level-stair__drawing" viewBox={`0 0 ${geo.width} ${LEVEL_STAIR_HEIGHT}`} aria-hidden="true" focusable="false">
    {geo.steps.map((step) => (
      <g key={step.band} className={step.reached ? "pl-level-stair__step pl-level-stair__step--reached" : "pl-level-stair__step"}>
        <rect x={step.x} y={step.y} width={LEVEL_STAIR_STEP_WIDTH} height={step.height} rx="3" />
        <text x={step.x + LEVEL_STAIR_STEP_WIDTH / 2} y={LEVEL_STAIR_HEIGHT - 4} textAnchor="middle">
          {step.band}
        </text>
      </g>
    ))}
    {geo.flag === null ? null : (
      <g className="pl-level-stair__flag">
        <path d={`M${geo.flag.x} ${geo.flag.y} v-26`} strokeWidth="2" />
        <path d={`M${geo.flag.x} ${geo.flag.y - 26} l12 5 l-12 5 z`} />
      </g>
    )}
    {/* Coco, small, standing on the declared step: the empty state's parrot, in miniature. */}
    <g className="pl-level-stair__coco" style={{ transform: `translate(${geo.coco.x}px, ${geo.coco.y}px)` }}>
      <g key={hop} className={hop === undefined ? undefined : "pl-level-stair__hop"}>
        <ellipse cx="0" cy="-9" rx="8" ry="9" fill="var(--primary)" />
        <circle cx="0" cy="-21" r="6" fill="var(--primary)" />
        <path d="M4 -22 q5 1 4 5 q-3 -2 -5 -2 z" fill="var(--accent)" />
        <circle cx="-2" cy="-22" r="1.5" fill="var(--surface)" />
      </g>
    </g>
  </svg>
);

/** The exemption's stamp, pressed on once with the celebration spring; the caller's words say it. */
export const StairStamp = ({ word }: { word: string }): JSX.Element => (
  <span className="pl-level-stair__stamp" aria-hidden="true">
    {word}
  </span>
);
