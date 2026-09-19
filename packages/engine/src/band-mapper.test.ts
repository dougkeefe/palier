import { describe, expect, it } from "vitest";

import {
  RawScoreOutOfRangeError,
  UnmappedRawScoreError,
  bandForRawScore,
  mapRawScore,
  pointsToBand,
} from "./band-mapper.js";
import { pscSle } from "./__tests__/read-profile.js";

const profile = pscSle();
const readingSupervised = profile.variants["reading-supervised"]!;
const writingUnsupervised = profile.variants["writing-unsupervised"]!;

/**
 * Worked examples at every boundary (implementation-plan.md 6.2, tier 1). The
 * cut ranges are inclusive, so a score sitting exactly on a cut earns the
 * higher band; the row either side of each cut is what proves it.
 */
describe("reading-supervised boundaries", () => {
  it.each([
    [0, "X"],
    [17, "X"],
    [18, "A"],
    [27, "A"],
    [28, "B"],
    [37, "B"],
    [38, "C"],
    [44, "C"],
    [45, "E"],
    [50, "E"],
  ])("a raw score of %i earns band %s", (raw, band) => {
    expect(bandForRawScore(readingSupervised, raw)).toBe(band);
  });

  it("earns C at exactly the cut, not B", () => {
    expect(bandForRawScore(readingSupervised, 38)).toBe("C");
  });

  it("earns B one mark below the C cut", () => {
    expect(bandForRawScore(readingSupervised, 37)).toBe("B");
  });
});

describe("the outcome a results screen renders", () => {
  it('supports "38 of 50, level C starts at 38"', () => {
    expect(mapRawScore(readingSupervised, 38)).toEqual({
      band: "C",
      rank: 3,
      raw: 38,
      scored: 50,
      bandMin: 38,
      bandMax: 44,
      next: { band: "E", min: 45, pointsAway: 7 },
    });
  });

  it("computes the distance to the next band from the cut points", () => {
    expect(mapRawScore(readingSupervised, 37).next).toEqual({
      band: "C",
      min: 38,
      pointsAway: 1,
    });
  });

  it("offers nothing further at the top band", () => {
    expect(mapRawScore(readingSupervised, 50).next).toBeNull();
  });
});

describe("pointsToBand", () => {
  it("returns the marks still needed", () => {
    expect(pointsToBand(readingSupervised, 30, "C")).toBe(8);
  });

  it("returns null when the band is already held", () => {
    expect(pointsToBand(readingSupervised, 40, "C")).toBeNull();
  });

  it("returns null when the band is already exceeded", () => {
    expect(pointsToBand(readingSupervised, 46, "C")).toBeNull();
  });

  it("returns null for a band this variant does not award", () => {
    // The unsupervised papers have no E: it is an exemption awarded at the top
    // of the supervised range (product-requirements.md 5).
    expect(pointsToBand(writingUnsupervised, 10, "E")).toBeNull();
  });
});

describe("out-of-range raw scores", () => {
  it("names the scored count and the pilot exclusion in the error", () => {
    expect(() => mapRawScore(readingSupervised, 60)).toThrow(RawScoreOutOfRangeError);
    expect(() => mapRawScore(readingSupervised, 60)).toThrow(/50 scored items/);
  });

  it("rejects the administered count on a variant with pilot items", () => {
    // 60 items are administered, 50 are scored. Passing 60 means the caller
    // counted pilots, and silently returning E would hide that.
    expect(() => mapRawScore(readingSupervised, 51)).toThrow(RawScoreOutOfRangeError);
  });
});

describe("writing-unsupervised, the variant whose X band was inferred", () => {
  it.each([
    [0, "X"],
    [10, "X"],
    [11, "A"],
    [16, "A"],
    [17, "B"],
    [23, "B"],
    [24, "C"],
    [30, "C"],
  ])("a raw score of %i earns band %s", (raw, band) => {
    expect(bandForRawScore(writingUnsupervised, raw)).toBe(band);
  });
});

describe("a variant whose cut table has a hole", () => {
  /**
   * `examProfileSchema` makes this unrepresentable in a loaded profile, so this
   * is what happens when someone hand-builds a variant in code and bypasses it.
   * It throws rather than guessing, and the message says where to look.
   */
  const holed = {
    skill: "reading",
    mode: "unsupervised",
    testNumbers: [],
    items: 10,
    scored: 10,
    cuts: { X: [0, 3], C: [7, 10] },
    minutes: 45,
  } as unknown as typeof readingSupervised;

  it("throws rather than guessing a band for an unmapped score", () => {
    expect(() => mapRawScore(holed, 5)).toThrow(UnmappedRawScoreError);
  });

  it("says the schema is the thing that should have caught it", () => {
    expect(() => mapRawScore(holed, 5)).toThrow(/bug in the schema/);
  });

  it("still maps the scores the table does cover", () => {
    expect(bandForRawScore(holed, 8)).toBe("C");
  });
});
