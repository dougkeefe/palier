// Design tokens (source of truth) and the contrast gate.
export {
  EXAM_OVERRIDES,
  TOKEN_SETS,
  TOKENS,
  tokenValue,
  type ThemeName,
  type TokenDefinition,
  type TokenName,
  type TokenOverride,
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
  dialogClass,
  optionRowKeydown,
  optionRowState,
  railGeometry,
  type BandMeterGeometry,
  type BandMeterInput,
  type ButtonVariant,
  type CalloutState,
  type CalloutTone,
  type DialogPlacement,
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
} from "./primitives/logic.js";

// Primitives.
export { Button, type ButtonProps } from "./primitives/Button.js";
export { Card, type CardProps } from "./primitives/Card.js";
export { Callout, type CalloutProps } from "./primitives/Callout.js";
export { EmptyState, type EmptyStateProps } from "./primitives/EmptyState.js";
export { Glyph, type GlyphProps } from "./primitives/Glyph.js";
export { OptionRow, type OptionRowProps } from "./primitives/OptionRow.js";
export { ProgressRail, type ProgressRailProps } from "./primitives/ProgressRail.js";
export { BandMeter, type BandMeterProps } from "./primitives/BandMeter.js";
export { Sheet, type SheetProps } from "./primitives/Sheet.js";
export { Passage, type PassageProps } from "./primitives/Passage.js";
export { Toast, type ToastProps } from "./primitives/Toast.js";
export { Mascot } from "./primitives/Mascot.js";
export { Timer, type TimerProps } from "./primitives/Timer.js";
export { Dialog, type DialogProps } from "./primitives/Dialog.js";

// The render half of the item type registry (implementation-plan.md §3.4, ADR 17).
export { McqItem, type ItemRenderer, type ItemRendererProps } from "./item-types/McqItem.js";
export { itemRenderers } from "./item-types/renderers.js";
