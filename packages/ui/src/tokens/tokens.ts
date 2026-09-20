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

/** The nine token names, without the leading `--`. */
export type TokenName =
  | "bg"
  | "surface"
  | "ink"
  | "ink-muted"
  | "primary"
  | "accent"
  | "correct"
  | "incorrect"
  | "info";

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
] as const;

const BY_NAME: ReadonlyMap<TokenName, TokenDefinition> = new Map(
  TOKENS.map((t) => [t.name, t]),
);

/** The hex value of a token in a given theme. Throws on an unknown name. */
export const tokenValue = (name: TokenName, theme: ThemeName): string => {
  const def = BY_NAME.get(name);
  if (def === undefined) {
    throw new Error(`Unknown design token: ${name}`);
  }
  return theme === "light" ? def.light : def.dark;
};
