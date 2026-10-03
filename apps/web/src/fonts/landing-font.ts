import localFont from "next/font/local";

/**
 * The landing page's serif, preloaded (progress.md D201). It is `fonts.ts`'s Source Serif 4 file, declared again so that
 * only the landing page preloads it: `next/font` preloads a face on the routes that import its declaration, and
 * `fonts.ts` is the layout's, so a preload there would cost every page a font only passages use (D161). The landing
 * page sets its hero in this face, so without the preload the face arrived after the first paint and the French hero
 * rewrapped as it swapped in, a layout shift that cost `/fr` its Lighthouse budget in CI.
 *
 * The same bytes are emitted to the same `/_next/static/media/` file, so a page with both downloads it once.
 */
export const landingFont = localFont({
  src: "./source-serif-4-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-landing-serif",
  display: "swap",
  preload: true,
  adjustFontFallback: "Times New Roman",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});
