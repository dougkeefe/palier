// @vitest-environment node
// The drift guard reads a file off disk; the ui project otherwise runs in jsdom,
// where import.meta.url is not a file:// URL. This module needs neither DOM nor jsdom.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { renderTokensCss } from "./css.js";

describe("renderTokensCss", () => {
  const css = renderTokensCss();

  it("declares the one theme on :root, and says it is light", () => {
    expect(css).toMatch(/:root \{\n {2}color-scheme: light;\n {2}--bg: #F3F2F2;/);
  });

  it("has no dark theme and no manual toggle (D202)", () => {
    expect(css).not.toContain("prefers-color-scheme");
    expect(css).not.toContain("data-theme");
  });
});

describe("renderTokensCss — the exam set", () => {
  const css = renderTokensCss();
  const examAt = css.indexOf('[data-mode="exam"] {');
  const examBlock = css.slice(examAt, css.indexOf("}", examAt));

  it("declares the exam overrides on [data-mode=\"exam\"], after the default block", () => {
    expect(examAt).toBeGreaterThan(css.indexOf(":root {"));
    expect(examBlock).toContain("--primary: #33373B;");
  });

  it("writes only the tokens the exam set overrides", () => {
    expect(examBlock).not.toContain("--bg:");
    expect(examBlock).not.toContain("--ink:");
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
