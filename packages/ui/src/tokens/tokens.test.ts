import { describe, expect, it } from "vitest";

import { EXAM_OVERRIDES, TOKENS, tokenValue } from "./tokens.js";

describe("design tokens", () => {
  it("defines the design's roles (D202): the paper and its panels, the inks, the teal, the rule and the four states", () => {
    expect(TOKENS.map((t) => t.name)).toEqual([
      "bg",
      "surface",
      "surface-tint",
      "surface-quiet",
      "surface-deep",
      "ink",
      "ink-soft",
      "ink-muted",
      "on-deep",
      "on-deep-muted",
      "primary",
      "primary-hover",
      "accent",
      "link",
      "rule",
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

  it("gives every token one 6-digit hex: there is no dark theme (D202)", () => {
    for (const t of TOKENS) {
      expect(t.value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("is the design's paper, ink and teal", () => {
    expect(tokenValue("bg")).toBe("#F3F2F2");
    expect(tokenValue("ink")).toBe("#201E1D");
    expect(tokenValue("primary")).toBe("#00384A");
  });
});

describe("tokenValue", () => {
  it("returns the default set's value when no set is named", () => {
    expect(tokenValue("surface-tint")).toBe("#D9F1F8");
  });

  it("throws on an unknown token name", () => {
    // @ts-expect-error — the guard exists for callers that reach it dynamically.
    expect(() => tokenValue("nope")).toThrow(/Unknown design token/);
  });
});

describe("the exam token set", () => {
  it("gives an overridden token its exam value: charcoal in place of the teal", () => {
    expect(tokenValue("primary", "exam")).toBe("#33373B");
  });

  it("keeps the paper and the ink, which it does not override", () => {
    expect(EXAM_OVERRIDES.bg).toBeUndefined();
    expect(EXAM_OVERRIDES.ink).toBeUndefined();
    expect(tokenValue("bg", "exam")).toBe(tokenValue("bg"));
    expect(tokenValue("ink", "exam")).toBe(tokenValue("ink"));
  });

  it("uses 6-digit hex throughout", () => {
    for (const value of Object.values(EXAM_OVERRIDES)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
