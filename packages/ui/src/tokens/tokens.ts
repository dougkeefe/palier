/**
 * The design tokens. This module is the **single source of truth**: the CSS custom
 * properties shipped in `styles/tokens.css` are generated from it (see `./css.ts`) and
 * held to it by a drift-guard test, and the contrast gate (`../contrast.ts`) reads its
 * values rather than a second copy.
 *
 * The palette is the app as designed in `docs/Palier landing page/Palier App.dc.html`
 * (progress.md D202): a teal ink on a warm paper, flat colour panels, and nothing else.
 * It replaced product-requirements.md §10.2's plum and amber. It is **light only**, by
 * the human's ruling: there is no dark theme. Every value is a 6-digit `#RRGGBB` hex, so
 * the contrast math has one format to parse.
 */

/**
 * The token sets. `default` is the design's. `exam` is the mock-exam runner's muted one
 * (product-requirements.md §8.4: "deliberately colder", with a "muted palette";
 * progress.md D84, ruling 11; D202): the same paper, ink and serif, with charcoal and
 * warm greys in place of the teal. It applies under `[data-mode="exam"]` and overrides
 * only the tokens it lists.
 */
export type TokenSetName = "default" | "exam";

/** The token names, without the leading `--`. */
export type TokenName =
  | "bg"
  | "surface"
  | "surface-tint"
  | "surface-quiet"
  | "surface-mint"
  | "surface-rose"
  | "surface-deep"
  | "ink"
  | "ink-soft"
  | "ink-muted"
  | "on-deep"
  | "on-deep-muted"
  | "primary"
  | "primary-hover"
  | "accent"
  | "link"
  | "rule"
  | "correct"
  | "incorrect"
  | "info"
  | "warning";

export type TokenDefinition = {
  readonly name: TokenName;
  /** The CSS custom property, e.g. `--ink-muted`. */
  readonly cssVar: `--${TokenName}`;
  readonly value: string;
  /** What the token is for. */
  readonly use: string;
};

const token = (name: TokenName, value: string, use: string): TokenDefinition => ({
  name,
  cssVar: `--${name}`,
  value,
  use,
});

export const TOKENS: readonly TokenDefinition[] = [
  token("bg", "#F3F2F2", "The page: the design's paper"),
  token("surface", "#FFFFFF", "Cards, options, the language switch"),
  token("surface-tint", "#D9F1F8", "A selected option, a highlighted panel, hover on a light control"),
  token("surface-quiet", "#E8E6E5", "Secondary buttons, the nav track, a quiet panel, an input's fill"),
  // The brand's two other light fills (`colors.css`'s ok and no backgrounds), which Today's skill
  // cards take beside the tint (progress.md D219). Held to the inks and primary only: the state
  // colours are never set on them.
  token("surface-mint", "#BFE6C8", "A skill card's fill: written expression"),
  token("surface-rose", "#F4C6D9", "A skill card's fill: oral expression"),
  token("surface-deep", "#004A61", "A deep panel: today's plan"),
  token("ink", "#201E1D", "Body text"),
  token("ink-soft", "#3D3936", "Paragraphs beside a heading"),
  token("ink-muted", "#55504D", "Secondary text: labels, counts, captions"),
  token("on-deep", "#FFFFFF", "Text and the button disc on a deep panel, the footer or a primary button"),
  token("on-deep-muted", "#D3DFE3", "Quieter text on a deep panel or the footer"),
  token("primary", "#00384A", "Primary buttons, a selection's ring, the footer"),
  token("primary-hover", "#00607D", "A primary button under the pointer"),
  // The design's one bright teal. It carries information as the focus ring and the sync dot,
  // so it is held to 3:1 for UI, where the old amber was decorative and ungated.
  token("accent", "#0088B0", "The focus ring, the sync dot, the streak flame"),
  token("link", "#00607D", "Links in running text"),
  // Not in the design, whose inputs are a fill alone: about 1.1:1 against the paper, short of
  // WCAG 1.4.11's 3:1 for a component's boundary (D202). An input and a rule are drawn in it.
  token("rule", "#6B6663", "An input's border, a divider that separates controls"),
  token("correct", "#1A6B50", "Correct states"),
  token("incorrect", "#B23A48", "Incorrect states"),
  token("info", "#00607D", "Information, tips"),
  // The exam clock turns amber at ten minutes (§8.4), and that colour carries information.
  token("warning", "#8A5300", "Time running low, cautions"),
] as const;

/**
 * The exam set's overrides: charcoal and warm greys in place of the teal, on the same paper
 * and ink. Every other token falls back to the default. The contrast gate runs over both sets.
 */
export const EXAM_OVERRIDES: Readonly<Partial<Record<TokenName, string>>> = {
  "surface-tint": "#E4E2E1",
  "surface-deep": "#2F3134",
  "on-deep-muted": "#D9D7D5",
  primary: "#33373B",
  "primary-hover": "#50555C",
  accent: "#6B6663",
  link: "#45484C",
  info: "#45484C",
  incorrect: "#A8323F",
  warning: "#7F4E00",
};

export const TOKEN_SETS: readonly TokenSetName[] = ["default", "exam"];

const BY_NAME: ReadonlyMap<TokenName, TokenDefinition> = new Map(
  TOKENS.map((t) => [t.name, t]),
);

/**
 * The hex value of a token in a given set. A set that does not override the token gives
 * the default's value. Throws on an unknown name.
 */
export const tokenValue = (name: TokenName, set: TokenSetName = "default"): string => {
  const def = BY_NAME.get(name);
  if (def === undefined) {
    throw new Error(`Unknown design token: ${name}`);
  }
  return (set === "exam" ? EXAM_OVERRIDES[name] : undefined) ?? def.value;
};
