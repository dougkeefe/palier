/**
 * The testable behaviour behind the primitives, kept out of the `.tsx` renderers
 * so it can be unit-tested without a DOM and so it falls under the
 * `packages/ui/src/**\/*.ts` 90%-branch coverage glob (§6.3). The renderers are
 * thin wrappers over these functions. Glyph names map to `<Glyph>` in the UI;
 * correct/incorrect always carry a glyph, so colour is never the only signal
 * (product-requirements.md §10.2).
 */

/**
 * `light` is the white pill a deep panel carries (progress.md D202); the other four are §10.4's.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "light";

/**
 * The design's arrow disc at a button's end (D202): `next` for a step forward (→), `go` for
 * a way into something (↗). Both are drawn by the stylesheet and hidden from assistive
 * technology, so the label alone names the button and no glyph is a literal in JSX.
 */
export type ButtonArrow = "next" | "go";

export const buttonClass = (variant: ButtonVariant, arrow?: ButtonArrow): string =>
  arrow === undefined
    ? `pl-btn pl-btn--${variant}`
    : `pl-btn pl-btn--${variant} pl-btn--arrow${arrow === "go" ? " pl-btn--arrow-go" : ""}`;

/**
 * A card's fill (D202): `surface` is white on the paper, `tint` the light teal, `quiet` the
 * warm grey, `deep` the dark teal with light text. Flat, with no border and no shadow.
 */
export type CardTone = "surface" | "tint" | "quiet" | "mint" | "rose" | "deep";

export const cardClass = (tone: CardTone): string => (tone === "surface" ? "pl-card" : `pl-card pl-card--${tone}`);

export type GlyphName =
  | "check"
  | "cross"
  | "info"
  | "star"
  | "clock"
  | "flag"
  | "book"
  | "pen"
  | "mic"
  | "chevron-left"
  | "chevron-right";

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

// ---- TrendChart (§8.9: the band trend over time, the interval shaded, a gap where evidence is short) ----

/** The chart's drawing box, in SVG user units; the SVG scales to its container's width. */
export const TREND_CHART_WIDTH = 300;
export const TREND_CHART_HEIGHT = 100;
const TREND_CHART_PAD = 6;
/** Half the width an isolated week's interval is drawn at, so a one-point run still shows its range. */
const TREND_CHART_LONE_HALF_WIDTH = 3;

export type TrendChartGeometry = {
  /** One run of consecutive weeks with an estimate: its line and its interval's outline, as SVG `points`. */
  readonly runs: readonly { readonly line: string; readonly area: string }[];
  /** Every week with an estimate, as a dot, so a lone week is still seen. */
  readonly dots: readonly { readonly x: number; readonly y: number }[];
  /** The y of the 0%, 50% and 100% guides. */
  readonly guides: readonly number[];
};

const trendY = (value: number): number =>
  TREND_CHART_HEIGHT - TREND_CHART_PAD - clampUnit(value) * (TREND_CHART_HEIGHT - 2 * TREND_CHART_PAD);

const svgPoints = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/**
 * The chart's shapes from one estimate per week, oldest first, `null` where the evidence is short
 * (R10). A `null` breaks the line, so a week with too little evidence is drawn as a gap, never
 * bridged. Values are clamped to [0, 1] and an inverted interval is put right, as the band meter's.
 */
export const trendChartGeometry = (points: readonly (BandMeterInput | null)[]): TrendChartGeometry => {
  const span = TREND_CHART_WIDTH - 2 * TREND_CHART_PAD;
  const x = (i: number): number => (points.length === 1 ? TREND_CHART_WIDTH / 2 : TREND_CHART_PAD + (i * span) / (points.length - 1));
  type Placed = { readonly x: number; readonly y: number; readonly low: number; readonly high: number };
  const groups: Placed[][] = [];
  let current: Placed[] | null = null;
  for (const [i, point] of points.entries()) {
    if (point === null) {
      current = null;
      continue;
    }
    // A higher value is a smaller y, so the low bound is the larger y.
    const [low, high] = [trendY(point.low), trendY(point.high)].sort((a, b) => b - a) as [number, number];
    if (current === null) {
      current = [];
      groups.push(current);
    }
    current.push({ x: x(i), y: trendY(point.accuracy), low, high });
  }
  const runs = groups.map((run) => {
    const only = run.length === 1 ? run[0] : undefined;
    const outline: [number, number][] =
      only === undefined
        ? [...run.map((p): [number, number] => [p.x, p.high]), ...run.map((p): [number, number] => [p.x, p.low]).reverse()]
        : [
            [only.x - TREND_CHART_LONE_HALF_WIDTH, only.high],
            [only.x + TREND_CHART_LONE_HALF_WIDTH, only.high],
            [only.x + TREND_CHART_LONE_HALF_WIDTH, only.low],
            [only.x - TREND_CHART_LONE_HALF_WIDTH, only.low],
          ];
    return { line: svgPoints(run.map((p) => [p.x, p.y])), area: svgPoints(outline) };
  });
  return {
    runs,
    dots: groups.flat().map((p) => ({ x: p.x, y: p.y })),
    guides: [0, 0.5, 1].map(trendY),
  };
};

// ---- Sparkline (Today's minutes this week, progress.md D219) ----

/** The sparkline's drawing box, in SVG user units; the SVG scales to its container's width. */
export const SPARKLINE_WIDTH = 120;
export const SPARKLINE_HEIGHT = 40;
const SPARKLINE_PAD = 3;

export type SparklineGeometry = {
  /** The line, as SVG `points`. */
  readonly line: string;
  /** The line closed down to the baseline, for the fill beneath it. */
  readonly area: string;
};

/**
 * A sparkline's shapes from one value per period, oldest first. The tallest value touches the top;
 * zero is the baseline, so a quiet period is drawn flat, never hidden. A negative value counts as
 * zero, and a single value is drawn across the whole width.
 */
export const sparklineGeometry = (values: readonly number[]): SparklineGeometry => {
  const series = (values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : values).map((v) => Math.max(0, v));
  if (series.length === 0) return { line: "", area: "" };
  const peak = Math.max(...series);
  const base = SPARKLINE_HEIGHT - SPARKLINE_PAD;
  const span = SPARKLINE_WIDTH - 2 * SPARKLINE_PAD;
  const points = series.map((v, i): [number, number] => [
    SPARKLINE_PAD + (i * span) / (series.length - 1),
    peak === 0 ? base : base - (v / peak) * (SPARKLINE_HEIGHT - 2 * SPARKLINE_PAD),
  ]);
  const first = points[0] as [number, number];
  const last = points[points.length - 1] as [number, number];
  return {
    line: svgPoints(points),
    area: svgPoints([...points, [last[0], base], [first[0], base]]),
  };
};

// ---- MonthCalendar (Today's practice calendar, progress.md D219) ----

export type CalendarDay = {
  /** `YYYY-MM-DD`. */
  readonly day: string;
  /** The day of the month, 1–31. */
  readonly date: number;
  /** False for the previous and next months' days that fill the first and last weeks. */
  readonly inMonth: boolean;
};

const DAY_MS_UTC = 86_400_000;

/**
 * A month as whole weeks, Sunday first, as Canadian calendars set it in both languages: the first
 * week opens with the previous month's last days and the last closes with the next month's first.
 * Calendar arithmetic only, in UTC, so no time zone or daylight change can move a day.
 */
export const monthGrid = (year: number, month: number): readonly (readonly CalendarDay[])[] => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`${String(year)}-${String(month)} is not a month.`);
  }
  const first = Date.UTC(year, month - 1, 1);
  const daysIn = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = new Date(first).getUTCDay();
  const cells = Math.ceil((lead + daysIn) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells; i += 1) {
    const at = new Date(first + (i - lead) * DAY_MS_UTC);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]?.push({
      day: at.toISOString().slice(0, 10),
      date: at.getUTCDate(),
      inMonth: at.getUTCMonth() === month - 1,
    });
  }
  return weeks;
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

/**
 * `center` for a confirmation, `side` for a drawer that slides in from the edge, `full` for a
 * moment that takes the whole screen (a milestone, §9).
 */
export type DialogPlacement = "center" | "side" | "full";

export const dialogClass = (placement: DialogPlacement): string => `pl-dialog pl-dialog--${placement}`;

// ---- Mascot and streak flame (§9, §10.1, §10.5) ----

export type MascotPose = "asleep" | "cheer";

/** A cheering Coco settles in with the celebration spring; a sleeping one does not move. */
export const mascotClass = (pose: MascotPose): string => (pose === "cheer" ? "pl-mascot pl-celebrate" : "pl-mascot");

export const streakFlameClass = (lit: boolean): string => (lit ? "pl-streak-flame pl-streak-flame--lit" : "pl-streak-flame");

// ---- Voice form (studio mode's one visual, product-requirements.md §8.6, progress.md D184) ----

/** Two voices' loudness, each a root-mean-square level as the microphone meter reads one. */
export type VoiceLevels = { readonly examiner: number; readonly candidate: number };

/** The level at which a voice fills its layer's reach: speech at a normal distance reads about this. */
export const VOICE_FULL_LEVEL = 0.3;

/** How far past its resting size a layer grows at a full voice. */
export const VOICE_REACH = 0.35;

/** How much of the way to the level heard each frame moves, so the form breathes rather than flickers. */
export const VOICE_EASE = 0.25;

/** A layer's scale for a level: 1 at silence, `1 + VOICE_REACH` at a full voice and beyond, 1 for a reading that is not one. */
export const voiceFormScale = (level: number): number =>
  Number.isFinite(level) ? 1 + Math.min(Math.max(level, 0) / VOICE_FULL_LEVEL, 1) * VOICE_REACH : 1;

/** One frame's step from the level shown towards the level heard; a reading that is not one leaves it where it is. */
export const easeLevel = (shown: number, heard: number): number => (Number.isFinite(heard) ? shown + (heard - shown) * VOICE_EASE : shown);

/** A still form, under reduced motion, is drawn at rest and never moves. */
export const voiceFormClass = (still: boolean): string => (still ? "pl-voice-form pl-voice-form--still" : "pl-voice-form");
