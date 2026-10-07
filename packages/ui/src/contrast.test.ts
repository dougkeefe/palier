import { describe, expect, it } from "vitest";

import {
  CONTRAST_BODY_TEXT,
  CONTRAST_LARGE_TEXT_OR_UI,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from "./contrast.js";
import { TOKEN_SETS, type TokenName, tokenValue } from "./tokens/tokens.js";

describe("parseHex", () => {
  it("reads the three channels of a 6-digit hex", () => {
    expect(parseHex("#1E1824")).toEqual({ r: 0x1e, g: 0x18, b: 0x24 });
  });

  it("reads pure white as 255, 255, 255", () => {
    expect(parseHex("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("throws on a value that is not a 6-digit hex", () => {
    expect(() => parseHex("#FFF")).toThrow(/6-digit hex/);
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black", () => {
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("is 1 for white", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 10);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black against white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("is 1 for a colour against itself", () => {
    expect(contrastRatio("#5B2C6F", "#5B2C6F")).toBeCloseTo(1, 10);
  });

  it("is symmetric in its arguments", () => {
    expect(contrastRatio("#1E1824", "#FBF8F4")).toBeCloseTo(
      contrastRatio("#FBF8F4", "#1E1824"),
      10,
    );
  });
});

/**
 * The contrast gate over the token set (product-requirements.md §10.2, "validated in CI";
 * packages/ui/CLAUDE.md invariant; progress.md D202). Pairs are chosen by how a token is
 * actually used, not by permuting every combination:
 *   - every text token, the semantic states among them (which always carry a glyph and a
 *     label too), and primary, must clear 4.5:1 on the paper, a card, a tinted panel and a quiet one;
 *   - on a deep panel and on a primary button, the text and the button disc must clear 4.5:1;
 *   - the skill cards' fills (D219) carry the inks and primary only, so only those are held on them;
 *   - `primary` (a selection's ring, the radio dot), `accent` (the focus ring, the sync dot)
 *     and `rule` (an input's border) must clear 3:1 against what they sit on (WCAG 1.4.11).
 * There is one theme (D202), and both sets are held to every pair.
 */
type Pair = { readonly fg: TokenName; readonly bg: TokenName; readonly min: number };

const TEXT_TOKENS: readonly TokenName[] = ["ink", "ink-soft", "ink-muted", "link", "correct", "incorrect", "info", "warning"];
const LIGHT_SURFACES: readonly TokenName[] = ["bg", "surface", "surface-tint", "surface-quiet"];
const SKILL_SURFACES: readonly TokenName[] = ["surface-mint", "surface-rose"];
const DEEP_SURFACES: readonly TokenName[] = ["surface-deep", "primary"];
const UI_TOKENS: readonly TokenName[] = ["primary", "accent", "rule"];

const PAIRS: readonly Pair[] = [
  ...TEXT_TOKENS.flatMap((fg) => LIGHT_SURFACES.map((bg) => ({ fg, bg, min: CONTRAST_BODY_TEXT }))),
  // A skill card (D219): its name, its line and its rail's fill, which is primary.
  ...(["ink", "ink-soft", "ink-muted", "primary"] as const).flatMap((fg) =>
    SKILL_SURFACES.map((bg) => ({ fg, bg, min: CONTRAST_BODY_TEXT })),
  ),
  ...(["on-deep", "on-deep-muted"] as const).flatMap((fg) => DEEP_SURFACES.map((bg) => ({ fg, bg, min: CONTRAST_BODY_TEXT }))),
  // A light button on a deep panel: its label and its disc's glyph are primary on white.
  { fg: "primary", bg: "on-deep", min: CONTRAST_BODY_TEXT },
  // A primary button under the pointer, and a danger button, carry a white label.
  { fg: "on-deep", bg: "primary-hover", min: CONTRAST_BODY_TEXT },
  { fg: "on-deep", bg: "incorrect", min: CONTRAST_BODY_TEXT },
  ...UI_TOKENS.flatMap((fg) => (["bg", "surface"] as const).map((bg) => ({ fg, bg, min: CONTRAST_LARGE_TEXT_OR_UI }))),
  // primary is body text on the light panels too (the queue's links, the inset's heading, the accent
  // callout), which also covers a selected option's ring and dot on the tint.
  ...LIGHT_SURFACES.map((bg) => ({ fg: "primary" as const, bg, min: CONTRAST_BODY_TEXT })),
  // accent is the focus ring, which can land on a tinted or quiet panel.
  ...(["surface-tint", "surface-quiet"] as const).map((bg) => ({ fg: "accent" as const, bg, min: CONTRAST_LARGE_TEXT_OR_UI })),
];

describe("token-set contrast gate", () => {
  it.each(
    TOKEN_SETS.flatMap((set) =>
      PAIRS.map((pair) => ({
        set,
        ...pair,
        ratio: contrastRatio(tokenValue(pair.fg, set), tokenValue(pair.bg, set)),
      })),
    ),
  )("$set: --$fg on --$bg clears $min:1 (is $ratio:1)", ({ ratio, min }) => {
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});
