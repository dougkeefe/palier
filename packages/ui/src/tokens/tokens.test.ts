import { describe, expect, it } from "vitest";

import { TOKENS, tokenValue } from "./tokens.js";

describe("design tokens", () => {
  it("defines the nine tokens from product-requirements.md §10.2", () => {
    expect(TOKENS.map((t) => t.name)).toEqual([
      "bg",
      "surface",
      "ink",
      "ink-muted",
      "primary",
      "accent",
      "correct",
      "incorrect",
      "info",
    ]);
  });

  it("gives every token a `--name` CSS custom property", () => {
    for (const t of TOKENS) {
      expect(t.cssVar).toBe(`--${t.name}`);
    }
  });

  it("gives every token a 6-digit hex in both themes", () => {
    for (const t of TOKENS) {
      expect(t.light).toMatch(/^#[0-9A-F]{6}$/);
      expect(t.dark).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("tokenValue", () => {
  it("returns the light value for a light theme", () => {
    expect(tokenValue("primary", "light")).toBe("#5B2C6F");
  });

  it("returns the dark value for a dark theme", () => {
    expect(tokenValue("primary", "dark")).toBe("#B388CC");
  });

  it("throws on an unknown token name", () => {
    // @ts-expect-error — the guard exists for callers that reach it dynamically.
    expect(() => tokenValue("nope", "light")).toThrow(/Unknown design token/);
  });
});
