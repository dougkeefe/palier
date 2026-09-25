import { EXAM_OVERRIDES, TOKENS, type ThemeName, type TokenName, type TokenOverride } from "./tokens.js";

/**
 * Generate the CSS custom-property stylesheet from the token source of truth
 * (`./tokens.ts`). The committed `../styles/tokens.css` is this string, held to
 * it by a drift-guard test, so there is one place a colour is defined.
 *
 * Cascade, in order:
 *   1. `:root` carries the light theme as the default.
 *   2. `@media (prefers-color-scheme: dark)` switches to dark for users whose OS
 *      asks for it.
 *   3. `[data-theme="light"]` / `[data-theme="dark"]` come next, so a manual
 *      toggle (equal specificity to `:root`) wins over the OS preference.
 *   4. The exam set, `[data-mode="exam"]`, last, in the same order: light, then the
 *      OS dark preference, then the manual toggle. It is set on an element inside
 *      the page, so its own declarations beat the values it inherits from `:root`.
 *      The toggle selectors (`[data-theme] [data-mode]`, and both on one element)
 *      have specificity 0,2,0, so a manual choice beats the OS rule here too.
 */

const declarations = (theme: ThemeName): string =>
  TOKENS.map((t) => `  ${t.cssVar}: ${theme === "light" ? t.light : t.dark};`).join("\n");

const EXAM: readonly (readonly [TokenName, TokenOverride])[] = TOKENS.flatMap((t) => {
  const override = EXAM_OVERRIDES[t.name];
  return override === undefined ? [] : [[t.name, override] as const];
});

const examDeclarations = (theme: ThemeName, indent: string): string =>
  EXAM.map(([name, o]) => `${indent}--${name}: ${theme === "light" ? o.light : o.dark};`).join("\n");

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

[data-mode="exam"] {
${examDeclarations("light", "  ")}
}

@media (prefers-color-scheme: dark) {
  [data-mode="exam"] {
${examDeclarations("dark", "    ")}
  }
}

[data-theme="light"] [data-mode="exam"],
[data-theme="light"][data-mode="exam"] {
${examDeclarations("light", "  ")}
}

[data-theme="dark"] [data-mode="exam"],
[data-theme="dark"][data-mode="exam"] {
${examDeclarations("dark", "  ")}
}
`;
