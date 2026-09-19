# @palier/ui

Design tokens, primitives, and the item renderers registered by type (§3.2). The design
system, not the application.

**May import** `@palier/domain`, **types only**. Never `engine`, `app` or an adapter
(§3.1). A component that needs a computed value takes it as a prop.

## Invariants

- **No business logic, no data fetching.** Scoring, selection and trend are in
  `@palier/engine`; anything that awaits belongs above this package.
- **No string literals in JSX** — a lint rule fails the build, and both locale files move
  together (R8). Content in the non-interface language carries a `lang` attribute, which is
  what makes a screen reader pronounce it; this app mixes languages on every screen.
- **Colour is never the only signal.** Correct and incorrect also carry a glyph and a label.
  Every pair clears 4.5:1 for text and 3:1 for UI in both themes, asserted by a unit test
  over the token set (`product-requirements.md` §10.2).
- **Accessibility is a build gate, not an audit** (ADR 13). New surfaces get an axe
  assertion on their *states* — panel open, dialog focused — not the initial render alone.
- Logic (formatters, band-meter geometry, timer thresholds, keyboard handling, registry
  lookups) is 90% branch; rendering has no line target on purpose (§6.3).

## The three mistakes most likely to be made here

1. **Scoring or selection logic in a renderer**, because the data is right there.
2. **A hardcoded string**, or a key added to one locale file only.
3. **A new colour** that has not been through the contrast test.
