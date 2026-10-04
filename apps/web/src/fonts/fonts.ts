import localFont from "next/font/local";

/**
 * The app's one typeface, Source Serif 4, self-hosted (progress.md D65, D161), for headings, the
 * interface and passages alike, as the app is designed (D202; the landing page first, D201). It is a
 * variable woff2 of the Latin subset, which holds every French letter, « », the dashes and œ, and is
 * served from this origin under `/_next/static/media/`, so the CSP's `font-src 'self'` needs no new
 * origin. Where the file came from, and its hash, is `SOURCES.md`; it is under the SIL Open Font
 * License, beside it.
 *
 * It is **preloaded**: every page sets its first paint in it. Without the preload the face arrives
 * after that paint and a heading rewraps as it swaps in, a layout shift that cost the landing page's
 * `/fr` its Lighthouse budget in CI (D201). `globals.css` adds a metric-matched fallback face for any
 * load where it is still late.
 *
 * It is exposed as a CSS variable on `<html>`; `globals.css`, the landing page and `@palier/ui`'s
 * passage read it.
 */

/*
 * The face declares Google Fonts' Latin subset, as the file was cut, so the browser uses a fallback
 * outside it. The loader reads its arguments at build time and takes literals only.
 */
export const serifFont = localFont({
  src: "./source-serif-4-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-serif",
  display: "swap",
  preload: true,
  adjustFontFallback: "Times New Roman",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

/** The variable's class, for `<html>`. */
export const fontVariables = serifFont.variable;
