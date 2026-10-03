import { EXAM_OVERRIDES, TOKENS } from "./tokens.js";

/**
 * Generate the CSS custom-property stylesheet from the token source of truth
 * (`./tokens.ts`). The committed `../styles/tokens.css` is this string, held to
 * it by a drift-guard test, so there is one place a colour is defined.
 *
 * Two blocks, in order:
 *   1. `:root` carries the one theme, and says it is light (`color-scheme`), so the
 *      browser draws its own controls and scrollbars light too (progress.md D202:
 *      there is no dark theme). Paper is the screen's palette as it is, so print
 *      needs no block of its own.
 *   2. The exam set, `[data-mode="exam"]`. It is set on an element inside the page,
 *      so its own declarations beat the values it inherits from `:root`.
 */

export const renderTokensCss = (): string =>
  `/* Generated from packages/ui/src/tokens/tokens.ts by renderTokensCss().
   Do not edit by hand: the drift-guard test asserts this file equals the
   generator output. Change tokens.ts and regenerate. */

:root {
  color-scheme: light;
${TOKENS.map((t) => `  ${t.cssVar}: ${t.value};`).join("\n")}
}

[data-mode="exam"] {
${TOKENS.flatMap((t) => {
  const value = EXAM_OVERRIDES[t.name];
  return value === undefined ? [] : [`  ${t.cssVar}: ${value};`];
}).join("\n")}
}
`;
