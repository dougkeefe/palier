// Design tokens (source of truth) and the contrast gate.
export {
  EXAM_OVERRIDES,
  TOKEN_SETS,
  TOKENS,
  tokenValue,
  type TokenDefinition,
  type TokenName,
  type TokenSetName,
} from "./tokens/tokens.js";
export { renderTokensCss } from "./tokens/css.js";
export {
  CONTRAST_BODY_TEXT,
  CONTRAST_LARGE_TEXT_OR_UI,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from "./contrast.js";

// Primitive logic (pure, testable).
export {
  bandMeterGeometry,
  buttonClass,
  calloutState,
  cardClass,
  dialogClass,
  optionRowKeydown,
  optionRowState,
  railGeometry,
  trendChartGeometry,
  monthGrid,
  sparklineGeometry,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
  type CalendarDay,
  type SparklineGeometry,
  TREND_CHART_HEIGHT,
  TREND_CHART_WIDTH,
  type TrendChartGeometry,
  type BandMeterGeometry,
  type BandMeterInput,
  type ButtonArrow,
  type ButtonVariant,
  type CalloutState,
  type CardTone,
  type CalloutTone,
  type DialogPlacement,
  type MascotPose,
  type GlyphName,
  type OptionOutcome,
  type OptionRowInput,
  type OptionRowIntent,
  type OptionRowState,
  type RailGeometry,
  type SheetState,
  type SheetTone,
  type TimerState,
  type TimerTone,
  sheetState,
  timerState,
  easeLevel,
  voiceFormClass,
  voiceFormScale,
  VOICE_EASE,
  VOICE_FULL_LEVEL,
  VOICE_REACH,
  type VoiceLevels,
} from "./primitives/logic.js";

// Primitives.
export { Button, type ButtonProps } from "./primitives/Button.js";
export { Card, type CardProps } from "./primitives/Card.js";
export { Callout, type CalloutProps } from "./primitives/Callout.js";
export { EmptyState, type EmptyStateProps } from "./primitives/EmptyState.js";
export { GLYPH_PATHS, Glyph, type GlyphProps } from "./primitives/Glyph.js";
export { OptionRow, type OptionRowProps } from "./primitives/OptionRow.js";
export { ProgressRail, type ProgressRailProps } from "./primitives/ProgressRail.js";
export { BandMeter, type BandMeterProps } from "./primitives/BandMeter.js";
export { TrendChart, type TrendChartProps } from "./primitives/TrendChart.js";
export { Sparkline, type SparklineProps } from "./primitives/Sparkline.js";
export { MonthCalendar, type CalendarMark, type MonthCalendarProps } from "./primitives/MonthCalendar.js";
export { Sheet, type SheetProps } from "./primitives/Sheet.js";
export { Passage, type PassageProps } from "./primitives/Passage.js";
export { Toast, type ToastProps } from "./primitives/Toast.js";
export { Mascot, type MascotProps } from "./primitives/Mascot.js";
export { StreakFlame, type StreakFlameProps } from "./primitives/StreakFlame.js";
export { Timer, type TimerProps } from "./primitives/Timer.js";
export { Dialog, type DialogProps } from "./primitives/Dialog.js";
export { VoiceForm, type VoiceFormProps } from "./primitives/VoiceForm.js";

// The render half of the item type registry (implementation-plan.md §3.4, ADR 17).
export { McqItem, type ItemRenderer, type ItemRendererProps } from "./item-types/McqItem.js";
export { itemRenderers } from "./item-types/renderers.js";
