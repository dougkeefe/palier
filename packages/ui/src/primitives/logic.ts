/**
 * The testable behaviour behind the primitives, kept out of the `.tsx` renderers
 * so it can be unit-tested without a DOM and so it falls under the
 * `packages/ui/src/**\/*.ts` 90%-branch coverage glob (§6.3). The renderers are
 * thin wrappers over these functions. Glyph names map to `<Glyph>` in the UI;
 * correct/incorrect always carry a glyph, so colour is never the only signal
 * (product-requirements.md §10.2).
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const buttonClass = (variant: ButtonVariant): string => `pl-btn pl-btn--${variant}`;

export type GlyphName = "check" | "cross" | "info" | "star" | "clock" | "flag";

export type OptionOutcome = "correct" | "incorrect";

export type OptionRowInput = {
  readonly selected: boolean;
  /** Present once the answer is revealed; drives the correct/incorrect state. */
  readonly outcome?: OptionOutcome;
  readonly disabled: boolean;
};

export type OptionRowState = {
  readonly className: string;
  readonly glyph: GlyphName | null;
  readonly ariaChecked: boolean;
  readonly ariaDisabled: boolean;
};

export const optionRowState = (input: OptionRowInput): OptionRowState => {
  const classes = ["pl-option"];
  let glyph: GlyphName | null = null;

  if (input.outcome === "correct") {
    classes.push("pl-option--correct");
    glyph = "check";
  } else if (input.outcome === "incorrect") {
    classes.push("pl-option--incorrect");
    glyph = "cross";
  } else if (input.selected) {
    classes.push("pl-option--selected");
  }

  return {
    className: classes.join(" "),
    glyph,
    ariaChecked: input.selected,
    ariaDisabled: input.disabled,
  };
};

export type OptionRowIntent =
  | { readonly type: "move"; readonly to: number }
  | { readonly type: "select" }
  | { readonly type: "none" };

/**
 * Roving radio-group keyboard model. Arrow/Home/End move focus (wrapping),
 * Space/Enter select, everything else is ignored so the caller lets the event
 * through. `index` is the focused option, `count` the group size.
 */
export const optionRowKeydown = (key: string, index: number, count: number): OptionRowIntent => {
  if (count <= 0) {
    return { type: "none" };
  }
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return { type: "move", to: (index + 1) % count };
    case "ArrowUp":
    case "ArrowLeft":
      return { type: "move", to: (index - 1 + count) % count };
    case "Home":
      return { type: "move", to: 0 };
    case "End":
      return { type: "move", to: count - 1 };
    case " ":
    case "Enter":
      return { type: "select" };
    default:
      return { type: "none" };
  }
};

export type RailGeometry = {
  /** 0–100, clamped. */
  readonly percent: number;
  readonly valueNow: number;
  readonly valueMax: number;
};

export const railGeometry = (current: number, total: number): RailGeometry => {
  const valueMax = Math.max(total, 0);
  const valueNow = Math.min(Math.max(current, 0), valueMax);
  const percent = valueMax === 0 ? 0 : (valueNow / valueMax) * 100;
  return { percent, valueNow, valueMax };
};

export type CalloutTone = "info" | "correct" | "incorrect" | "accent";

export type CalloutState = {
  readonly className: string;
  readonly glyph: GlyphName;
};

export const calloutState = (tone: CalloutTone): CalloutState => {
  const glyph: GlyphName =
    tone === "correct"
      ? "check"
      : tone === "incorrect"
        ? "cross"
        : tone === "accent"
          ? "star"
          : "info";
  return { className: `pl-callout pl-callout--${tone}`, glyph };
};

// ---- BandMeter (§8.2 Zone A: accuracy per band tag, its interval a lighter extension) ----

export type BandMeterInput = {
  /** Proportion correct, in [0, 1]. */
  readonly accuracy: number;
  /** The interval's bounds, in [0, 1]. */
  readonly low: number;
  readonly high: number;
};

export type BandMeterGeometry = {
  /** Width of the solid bar, the point estimate, as a percentage. */
  readonly fillPercent: number;
  /** Where the lighter interval band starts, and how wide it is, as percentages. */
  readonly rangeStartPercent: number;
  readonly rangeWidthPercent: number;
  /** The rounded percentage for `aria-valuenow`. */
  readonly valueNow: number;
};

const clampUnit = (value: number): number => (Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0);

/**
 * The meter's shapes from an accuracy and its interval. Everything is clamped to
 * [0, 1], and an inverted interval is put right, so a malformed input draws a
 * plausible meter rather than a bar running off its track.
 */
export const bandMeterGeometry = (input: BandMeterInput): BandMeterGeometry => {
  const accuracy = clampUnit(input.accuracy);
  const [low, high] = [clampUnit(input.low), clampUnit(input.high)].sort((a, b) => a - b) as [number, number];
  return {
    fillPercent: accuracy * 100,
    rangeStartPercent: low * 100,
    rangeWidthPercent: (high - low) * 100,
    valueNow: Math.round(accuracy * 100),
  };
};

// ---- Sheet (§8.3: the feedback panel that slides up after confirm) ----

export type SheetTone = "correct" | "incorrect" | "neutral";

export type SheetState = {
  readonly className: string;
  readonly glyph: GlyphName | null;
};

export const sheetState = (tone: SheetTone): SheetState => ({
  className: `pl-sheet pl-sheet--${tone}`,
  glyph: tone === "correct" ? "check" : tone === "incorrect" ? "cross" : null,
});

// ---- Timer (§8.4: a visible clock that turns amber at ten minutes and red at two) ----

/**
 * The clock's tone. The thresholds that pick it are the caller's product rule, not
 * this package's: the tone arrives already decided.
 */
export type TimerTone = "normal" | "warning" | "urgent";

export type TimerState = {
  readonly className: string;
  /** A clock glyph once time runs low, beside a text label, so colour is never the only signal (§10.2). */
  readonly glyph: GlyphName | null;
};

export const timerState = (tone: TimerTone): TimerState => ({
  className: `pl-timer pl-timer--${tone}`,
  glyph: tone === "normal" ? null : "clock",
});

// ---- Dialog (a modal <dialog>: the exam's submit confirmation and item navigator) ----

/** `center` for a confirmation, `side` for a drawer that slides in from the edge. */
export type DialogPlacement = "center" | "side";

export const dialogClass = (placement: DialogPlacement): string => `pl-dialog pl-dialog--${placement}`;
