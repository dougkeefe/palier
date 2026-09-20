/**
 * WCAG 2.x relative-luminance and contrast-ratio arithmetic. Closed-form, no
 * dependency. This is what the contrast gate (product-requirements.md §10.2,
 * "validated in CI") is built on: every foreground/background pair in the token
 * set must clear 4.5:1 for body text and 3:1 for large text and UI.
 *
 * Formula: WCAG 2.1 §1.4.3 relative luminance, then the (L1+0.05)/(L2+0.05)
 * ratio with the lighter luminance on top.
 */

/** WCAG minimums, named so a test reads as the requirement rather than a number. */
export const CONTRAST_BODY_TEXT = 4.5;
export const CONTRAST_LARGE_TEXT_OR_UI = 3;

const HEX = /^#[0-9a-fA-F]{6}$/;

type Rgb = { readonly r: number; readonly g: number; readonly b: number };

/** Parse `#RRGGBB` into channels in [0, 255]. Throws on any other shape. */
export const parseHex = (hex: string): Rgb => {
  if (!HEX.test(hex)) {
    throw new Error(`Not a 6-digit hex colour: ${hex}`);
  }
  const int = Number.parseInt(hex.slice(1), 16);
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
};

const linearise = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance of a colour, in [0, 1]. */
export const relativeLuminance = (hex: string): number => {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
};

/** Contrast ratio between two colours, from 1 (identical) to 21 (black/white). */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};
