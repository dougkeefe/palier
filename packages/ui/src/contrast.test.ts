import { describe, expect, it } from "vitest";

import {
  CONTRAST_BODY_TEXT,
  CONTRAST_LARGE_TEXT_OR_UI,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from "./contrast.js";
import { TOKEN_SETS, type ThemeName, type TokenName, tokenValue } from "./tokens/tokens.js";

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
 * The contrast gate over the token set (product-requirements.md §10.2, "validated
 * in CI"; packages/ui/CLAUDE.md invariant). Pairs are chosen by how a token is
 * actually used, not by permuting every combination:
 *   - text tokens (body and secondary) and the semantic state colours, which
 *     §10.2 says always accompany a text label, must clear 4.5:1;
 *   - `primary`, used for brand and UI, must clear 3:1 (large text / UI);
 *   - the primary button paints its label in `--surface` over `--primary`, so
 *     that specific pair must clear body-text contrast.
 * `accent` is deliberately absent: §10.2 assigns it to highlights, the streak and
 * the mascot — decorative, never body text or an information-bearing UI boundary,
 * so it is not a contrast-critical foreground/background pair.
 */
type Pair = { readonly fg: TokenName; readonly bg: TokenName; readonly min: number };

const TEXT_TOKENS: readonly TokenName[] = ["ink", "ink-muted", "correct", "incorrect", "info", "warning"];
const BACKGROUNDS: readonly TokenName[] = ["bg", "surface"];

const PAIRS: readonly Pair[] = [
  ...TEXT_TOKENS.flatMap((fg) => BACKGROUNDS.map((bg) => ({ fg, bg, min: CONTRAST_BODY_TEXT }))),
  ...BACKGROUNDS.map((bg) => ({ fg: "primary" as const, bg, min: CONTRAST_LARGE_TEXT_OR_UI })),
  { fg: "surface", bg: "primary", min: CONTRAST_BODY_TEXT },
];

const THEMES: readonly ThemeName[] = ["light", "dark"];

// Both sets are held to the same pairs: the exam runner's muted palette is a whole
// scheme, not a decoration, so every pair it overrides must still clear the bar.
describe("token-set contrast gate", () => {
  it.each(
    TOKEN_SETS.flatMap((set) =>
      THEMES.flatMap((theme) =>
        PAIRS.map((pair) => ({
          set,
          theme,
          ...pair,
          ratio: contrastRatio(tokenValue(pair.fg, theme, set), tokenValue(pair.bg, theme, set)),
        })),
      ),
    ),
  )("$set $theme: --$fg on --$bg clears $min:1 (is $ratio:1)", ({ ratio, min }) => {
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});
