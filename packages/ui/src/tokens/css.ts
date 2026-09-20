import { TOKENS, type ThemeName } from "./tokens.js";

/**
 * Generate the CSS custom-property stylesheet from the token source of truth
 * (`./tokens.ts`). The committed `../styles/tokens.css` is this string, held to
 * it by a drift-guard test, so there is one place a colour is defined.
 *
 * Cascade, in order:
 *   1. `:root` carries the light theme as the default.
 *   2. `@media (prefers-color-scheme: dark)` switches to dark for users whose OS
 *      asks for it.
 *   3. `[data-theme="light"]` / `[data-theme="dark"]` come last, so a manual
 *      toggle (equal specificity to `:root`) wins over the OS preference.
 */

const declarations = (theme: ThemeName): string =>
  TOKENS.map((t) => `  ${t.cssVar}: ${theme === "light" ? t.light : t.dark};`).join("\n");

export const renderTokensCss = (): string =>
  `/* Generated from packages/ui/src/tokens/tokens.ts by renderTokensCss().
   Do not edit by hand: the drift-guard test asserts this file equals the
   generator output. Change tokens.ts and regenerate. */

:root {
${declarations("light")}
}

@media (prefers-color-scheme: dark) {
  :root {
${TOKENS.map((t) => `    ${t.cssVar}: ${t.dark};`).join("\n")}
  }
}

[data-theme="light"] {
${declarations("light")}
}

[data-theme="dark"] {
${declarations("dark")}
}
`;
