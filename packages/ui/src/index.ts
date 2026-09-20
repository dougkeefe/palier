// Design tokens (source of truth) and the contrast gate.
export {
  TOKENS,
  tokenValue,
  type ThemeName,
  type TokenDefinition,
  type TokenName,
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
  buttonClass,
  calloutState,
  optionRowKeydown,
  optionRowState,
  railGeometry,
  type ButtonVariant,
  type CalloutState,
  type CalloutTone,
  type GlyphName,
  type OptionOutcome,
  type OptionRowInput,
  type OptionRowIntent,
  type OptionRowState,
  type RailGeometry,
} from "./primitives/logic.js";

// Primitives.
export { Button, type ButtonProps } from "./primitives/Button.js";
export { Card, type CardProps } from "./primitives/Card.js";
export { Callout, type CalloutProps } from "./primitives/Callout.js";
export { EmptyState, type EmptyStateProps } from "./primitives/EmptyState.js";
export { Glyph, type GlyphProps } from "./primitives/Glyph.js";
export { OptionRow, type OptionRowProps } from "./primitives/OptionRow.js";
export { ProgressRail, type ProgressRailProps } from "./primitives/ProgressRail.js";
