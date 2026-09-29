import localFont from "next/font/local";

/**
 * The three typefaces PRD §10.3 names, self-hosted (progress.md D65, D159). Each is a variable
 * woff2 of the Latin subset, which holds every French letter, « », the dashes and œ, and is
 * served from this origin under `/_next/static/media/`, so the CSP's `font-src 'self'` needs no
 * new origin. Where each file came from, and its hash, is `SOURCES.md`; each is under the SIL
 * Open Font License, beside it.
 *
 * - **Inter** for the interface and **Figtree** for headings are preloaded: they are the two above
 *   the fold (§10.3).
 * - **Source Serif 4** is for passages only, and is not preloaded. The service worker follows the
 *   stylesheet to it, so a passage still reads in it offline (D159).
 *
 * Each is exposed as a CSS variable on `<html>`; `globals.css` and `@palier/ui`'s passage read them.
 * `display: swap` and the metric-matched fallback keep a late font from shifting the layout.
 */

/*
 * Each face declares Google Fonts' Latin subset, as the files were cut, so the browser uses a
 * fallback outside it. The loader reads its arguments at build time and takes literals only, so
 * the range is written out in each call rather than shared.
 */

export const interfaceFont = localFont({
  src: "./inter-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-sans",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

export const headingFont = localFont({
  src: "./figtree-latin-wght.woff2",
  weight: "500 800",
  variable: "--font-display",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

export const passageFont = localFont({
  src: "./source-serif-4-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

/** The three variables' classes, for `<html>`. */
export const fontVariables = [interfaceFont.variable, headingFont.variable, passageFont.variable].join(" ");
