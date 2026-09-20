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

export type GlyphName = "check" | "cross" | "info" | "star";

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
