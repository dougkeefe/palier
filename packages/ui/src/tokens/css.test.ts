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

describe("renderTokensCss — print", () => {
  const css = renderTokensCss();

  it("prints in the light theme whatever the screen shows, after the OS preference and the toggle", () => {
    const printAt = css.indexOf("@media print {");
    expect(printAt).toBeGreaterThan(css.indexOf('[data-theme="dark"] {'));
    expect(css.slice(printAt)).toMatch(/^@media print \{\n {2}:root,\n {2}\[data-theme\] \{\n {4}--bg: #FBF8F4;/);
  });
});

describe("renderTokensCss — the exam set", () => {
  const css = renderTokensCss();

  it("declares the exam overrides on [data-mode=\"exam\"], after every default block", () => {
    const examAt = css.indexOf('[data-mode="exam"] {');
    expect(examAt).toBeGreaterThan(css.indexOf('[data-theme="dark"] {'));
    expect(css.slice(examAt)).toMatch(/^\[data-mode="exam"\] \{\n {2}--bg: #F3F3F1;/);
  });

  it("switches the exam set to dark under the OS preference, then lets a manual toggle win", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\n {2}\[data-mode="exam"\] \{\n {4}--bg: #16181B;/);
    const osAt = css.lastIndexOf("@media");
    expect(css.indexOf('[data-theme="dark"] [data-mode="exam"]')).toBeGreaterThan(osAt);
    expect(css.indexOf('[data-theme="light"] [data-mode="exam"]')).toBeGreaterThan(osAt);
  });

  it("writes only the tokens the exam set overrides", () => {
    const examBlock = css.slice(css.indexOf('[data-mode="exam"] {'), css.indexOf("}", css.indexOf('[data-mode="exam"] {')));
    expect(examBlock).toContain("--primary:");
    expect(examBlock).not.toContain("--info:");
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
