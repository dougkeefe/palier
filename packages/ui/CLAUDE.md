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
  Every pair clears 4.5:1 for text and 3:1 for UI in both themes **and both token sets**, asserted
  by a unit test over the token set (`product-requirements.md` §10.2).
- **Two token sets** (progress.md D86). `default` is §10.2's. `exam` is the mock-exam runner's muted
  set (§8.4, D84 ruling 11): it overrides a subset of tokens under `[data-mode="exam"]`, and the
  rest fall back. `warning` is the tenth token, the exam clock's amber, because `accent` is
  decorative and ungated. `tokens.css` is generated: build the package, then write
  `renderTokensCss()` from `dist/tokens/css.js` over `src/styles/tokens.css`. The drift guard fails
  until you do. **Motion is one switch, not a class list** (progress.md D159): `components.css`
  turns every animation and transition off, with `!important`, for `*, ::before, ::after` under
  `prefers-reduced-motion` and inside `[data-mode="exam"]`, so a new animation cannot be left out of
  either. **Every duration is `--pl-motion-state` (120ms), `--pl-motion-panel` (200ms) or
  `--pl-motion-celebrate` (400ms)**, with `--pl-ease` or, on a celebration, `--pl-ease-spring`;
  `apps/web/src/app/motion.test.ts` fails a literal duration or a keyframe that fades. **`@media print` restores the light theme** on `:root` and on any `[data-theme]`,
  after the manual toggle and before the exam blocks, so a printout is always light (the progress
  summary, progress.md D145). It sits before the exam blocks, whose test finds the last `@media`.
- **Accessibility is a build gate, not an audit** (ADR 13). New surfaces get an axe
  assertion on their *states* — panel open, dialog focused — not the initial render alone.
- Logic (formatters, band-meter geometry, timer tone classes, keyboard handling, registry
  lookups) is 90% branch; rendering has no line target on purpose (§6.3).
- **Primitives:** Button, Card, Callout, EmptyState, Glyph, OptionRow, ProgressRail, and, from
  Slice 1, **BandMeter** (the estimate solid, its interval a lighter band, and no bar at all
  without an estimate, R10), **Sheet** (the feedback panel: a labelled region whose heading takes
  focus, not a dialog), **Passage** (serif, 66ch, `lang`-marked), **Toast** (a polite status
  message that does **not** dismiss itself: a timed disappearance is a 2.2.1 problem) and
  **Mascot** (Coco asleep, decorative and `aria-hidden`; the empty state's words carry the
  meaning, and its "z"s are drawn, not typed, so the no-literals rule holds), and, from Phase 3
  Slice 3, **Timer** (presentation only: the tone arrives decided, with a glyph and words as well
  as colour, and the caller's once-a-minute announcement is the only live text) and **Dialog** (a
  native modal `<dialog>` opened with `showModal()`, labelled by its heading, with a `side`
  placement for drawers and a `full` one for a milestone moment. Focus goes back to the opener on
  close), and, from Phase 7 Slice 4, **Mascot's `cheer` pose** (wings up, settling in with the
  celebration spring) and **StreakFlame** (decorative; lit in `accent` when today is done, an
  outline otherwise, never a warning).
- **Nothing that carries text fades in.** An `opacity` animation makes its text low-contrast for
  its opening frames, which fails 1.4.3 while it lasts. The Sheet's first draft did, and axe
  caught it (progress.md D65). Animate `transform`, and respect `prefers-reduced-motion`.
- **`itemRenderers` is the `render` half of the item type registry** (ADR 17): a
  `Record<ItemType, ItemRenderer>` parallel to `ITEM_TYPE_DEFINITIONS` in `@palier/domain`,
  which `apps/web` asserts covers the same union. A renderer that uses hooks (`McqItem`
  does) carries `"use client"`, or Next's server build fails when the barrel pulls it in.

## The three mistakes most likely to be made here

1. **Scoring or selection logic in a renderer**, because the data is right there.
2. **A hardcoded string**, or a key added to one locale file only.
3. **A new colour** that has not been through the contrast test.
