import { describe, expect, it } from "vitest";

import { EXAM_OVERRIDES, TOKENS, tokenValue } from "./tokens.js";

describe("design tokens", () => {
  it("defines the nine tokens from product-requirements.md §10.2, and the exam clock's warning", () => {
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
      "warning",
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

describe("the exam token set", () => {
  it("gives an overridden token its exam value in each theme", () => {
    expect(tokenValue("primary", "light", "exam")).toBe("#3D4752");
    expect(tokenValue("primary", "dark", "exam")).toBe("#A7B3C1");
  });

  it("falls back to the default for a token it does not override", () => {
    expect(EXAM_OVERRIDES.info).toBeUndefined();
    expect(tokenValue("info", "light", "exam")).toBe(tokenValue("info", "light"));
  });

  it("uses 6-digit hex throughout", () => {
    for (const o of Object.values(EXAM_OVERRIDES)) {
      expect(o.light).toMatch(/^#[0-9A-F]{6}$/);
      expect(o.dark).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
