/**
 * The design tokens, transcribed from product-requirements.md §10.2 (the colour
 * table). This module is the **single source of truth**: the CSS custom
 * properties shipped in `styles/tokens.css` are generated from it (see
 * `./css.ts`) and held to it by a drift-guard test, and the contrast gate
 * (`../contrast.ts`) reads its values rather than a second copy.
 *
 * A dark plum and warm amber scheme. Every value is a 6-digit `#RRGGBB` hex, so
 * the contrast math has one format to parse.
 */

export type ThemeName = "light" | "dark";

/**
 * The token sets. `default` is §10.2's playful scheme. `exam` is the mock-exam
 * runner's muted one (product-requirements.md §8.4: "deliberately colder", with a
 * "muted palette"; progress.md D84, ruling 11). It applies under
 * `[data-mode="exam"]` and overrides only the tokens it lists.
 */
export type TokenSetName = "default" | "exam";

/** The ten token names, without the leading `--`. */
export type TokenName =
  | "bg"
  | "surface"
  | "ink"
  | "ink-muted"
  | "primary"
  | "accent"
  | "correct"
  | "incorrect"
  | "info"
  | "warning";

export type TokenDefinition = {
  readonly name: TokenName;
  /** The CSS custom property, e.g. `--ink-muted`. */
  readonly cssVar: `--${TokenName}`;
  readonly light: string;
  readonly dark: string;
  /** What the token is for, from the §10.2 "Use" column. */
  readonly use: string;
};

const token = (name: TokenName, light: string, dark: string, use: string): TokenDefinition => ({
  name,
  cssVar: `--${name}`,
  light,
  dark,
  use,
});

export const TOKENS: readonly TokenDefinition[] = [
  token("bg", "#FBF8F4", "#17131C", "Page background"),
  token("surface", "#FFFFFF", "#221C29", "Cards"),
  token("ink", "#1E1824", "#F4EFEA", "Body text"),
  token("ink-muted", "#5B5266", "#B4A9BE", "Secondary text"),
  token("primary", "#5B2C6F", "#B388CC", "Primary actions, brand"),
  token("accent", "#E8913A", "#F2A85B", "Highlights, streak, mascot"),
  token("correct", "#1F7A5C", "#4FBF95", "Correct states"),
  token("incorrect", "#B23A48", "#E8788A", "Incorrect states"),
  token("info", "#2B6CB0", "#7FB3E8", "Information, tips"),
  // Not in §10.2. The exam clock turns amber at ten minutes (§8.4), and that colour
  // carries information, so it cannot be the ungated, decorative `accent`.
  token("warning", "#8A5300", "#F2B35B", "Time running low, cautions"),
] as const;

export type TokenOverride = { readonly light: string; readonly dark: string };

/**
 * The exam set's overrides: neutral greys and a slate primary in place of the plum,
 * cream and amber. Every other token falls back to the default. The contrast gate
 * runs over both sets.
 */
export const EXAM_OVERRIDES: Readonly<Partial<Record<TokenName, TokenOverride>>> = {
  bg: { light: "#F3F3F1", dark: "#16181B" },
  surface: { light: "#FFFFFF", dark: "#202327" },
  ink: { light: "#1C1E21", dark: "#EDEEEF" },
  "ink-muted": { light: "#50555C", dark: "#A9AEB5" },
  primary: { light: "#3D4752", dark: "#A7B3C1" },
  accent: { light: "#8C939B", dark: "#6F767E" },
  incorrect: { light: "#A8323F", dark: "#E8788A" },
  warning: { light: "#7F4E00", dark: "#E9B062" },
};

export const TOKEN_SETS: readonly TokenSetName[] = ["default", "exam"];

const BY_NAME: ReadonlyMap<TokenName, TokenDefinition> = new Map(
  TOKENS.map((t) => [t.name, t]),
);

/**
 * The hex value of a token in a given theme and set. A set that does not override
 * the token gives the default's value. Throws on an unknown name.
 */
export const tokenValue = (name: TokenName, theme: ThemeName, set: TokenSetName = "default"): string => {
  const def = BY_NAME.get(name);
  if (def === undefined) {
    throw new Error(`Unknown design token: ${name}`);
  }
  const value = (set === "exam" ? EXAM_OVERRIDES[name] : undefined) ?? def;
  return theme === "light" ? value.light : value.dark;
};
