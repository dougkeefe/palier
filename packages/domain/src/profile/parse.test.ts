import { describe, expect, it } from "vitest";

import {
  bandsFor,
  leitnerIntervalDays,
  orderedCuts,
  parseExamProfile,
  parseExamProfileOrThrow,
  variant,
  variantNames,
} from "./parse.js";
import { readProfile } from "../__tests__/read-profile.js";

const profile = parseExamProfileOrThrow(readProfile());

describe("parseExamProfile", () => {
  it("accepts the committed profile", () => {
    expect(parseExamProfile(readProfile()).ok).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(parseExamProfile("not a profile").ok).toBe(false);
  });

  it("rejects null", () => {
    expect(parseExamProfile(null).ok).toBe(false);
  });

  it("reports every problem, not just the first, so cut tables can be fixed in one pass", () => {
    const result = parseExamProfile({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });

  it("prefixes each error with the path that caused it", () => {
    const result = parseExamProfile({ ...(readProfile() as object), version: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith("version:"))).toBe(true);
    }
  });

  it("labels a root-level problem rather than leaving the path blank", () => {
    const result = parseExamProfile(42);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/^\(root\):/);
    }
  });
});

describe("parseExamProfileOrThrow", () => {
  it("returns the profile when it is valid", () => {
    expect(parseExamProfileOrThrow(readProfile()).id).toBe("psc-sle");
  });

  it("throws with every problem listed", () => {
    expect(() => parseExamProfileOrThrow({})).toThrow(/not valid/);
  });
});

describe("profile accessors", () => {
  it("lists the variant names in declaration order", () => {
    expect(variantNames(profile)).toEqual([
      "reading-supervised",
      "reading-unsupervised",
      "writing-supervised",
      "writing-unsupervised",
    ]);
  });

  it("returns a variant by name", () => {
    expect(variant(profile, "reading-supervised")?.scored).toBe(50);
  });

  it("returns null for a variant that does not exist, rather than undefined", () => {
    expect(variant(profile, "listening-supervised")).toBeNull();
  });

  it("orders a variant's bands lowest to highest", () => {
    expect(bandsFor(profile.variants["reading-supervised"]!)).toEqual([
      "X",
      "A",
      "B",
      "C",
      "E",
    ]);
  });

  it("omits bands a variant does not award", () => {
    expect(bandsFor(profile.variants["writing-unsupervised"]!)).toEqual([
      "X",
      "A",
      "B",
      "C",
    ]);
  });

  it("returns the interval for each of the four Leitner boxes", () => {
    expect([1, 2, 3, 4].map((box) => leitnerIntervalDays(profile, box))).toEqual([
      1, 3, 7, 21,
    ]);
  });

  it("returns null for box 5, which is retirement rather than a review (ADR 8)", () => {
    expect(leitnerIntervalDays(profile, 5)).toBeNull();
  });

  it("returns null for a box that does not exist", () => {
    expect(leitnerIntervalDays(profile, 99)).toBeNull();
  });
});

describe("orderedCuts", () => {
  it("returns the ladder lowest band first", () => {
    expect(orderedCuts(profile.variants["reading-supervised"]!)).toEqual([
      { band: "X", min: 0, max: 17 },
      { band: "A", min: 18, max: 27 },
      { band: "B", min: 28, max: 37 },
      { band: "C", min: 38, max: 44 },
      { band: "E", min: 45, max: 50 },
    ]);
  });

  it("omits bands the variant does not award", () => {
    expect(
      orderedCuts(profile.variants["writing-unsupervised"]!).map((c) => c.band),
    ).toEqual(["X", "A", "B", "C"]);
  });
});
