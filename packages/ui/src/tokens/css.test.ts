// @vitest-environment node
// The drift guard reads a file off disk; the ui project otherwise runs in jsdom,
// where import.meta.url is not a file:// URL. This module needs neither DOM nor jsdom.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { renderTokensCss } from "./css.js";

describe("renderTokensCss", () => {
  const css = renderTokensCss();

  it("declares the light theme on :root as the default", () => {
    expect(css).toMatch(/:root \{\n {2}--bg: #FBF8F4;/);
  });

  it("switches to dark under prefers-color-scheme", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark) {");
    expect(css).toMatch(/@media[^}]*--bg: #17131C;/s);
  });

  it("puts the manual [data-theme] overrides last so a toggle beats the OS preference", () => {
    const mediaAt = css.indexOf("@media");
    const dataThemeAt = css.indexOf('[data-theme="dark"]');
    expect(dataThemeAt).toBeGreaterThan(mediaAt);
  });
});

describe("tokens.css drift guard", () => {
  it("matches the generator output exactly (regenerate the file if this fails)", () => {
    const committed = readFileSync(
      fileURLToPath(new URL("../styles/tokens.css", import.meta.url)),
      "utf8",
    );
    expect(committed).toBe(renderTokensCss());
  });
});
