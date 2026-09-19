import { describe, expect, it } from "vitest";

import { BAND_RANK, BANDS, bandRank, compareBands, isBand } from "./bands.js";

describe("band ordering", () => {
  it("ranks E above C, because E is the exemption level and not a failure", () => {
    expect(bandRank("E")).toBeGreaterThan(bandRank("C"));
  });

  it("ranks X below A", () => {
    expect(bandRank("X")).toBeLessThan(bandRank("A"));
  });

  it("does not order the bands alphabetically", () => {
    const alphabetical = [...BANDS].sort();
    const byRank = [...BANDS].sort(compareBands);

    expect(byRank).not.toEqual(alphabetical);
  });

  it("orders the bands X, A, B, C, E when sorted by rank", () => {
    expect([...BANDS].sort(compareBands)).toEqual(["X", "A", "B", "C", "E"]);
  });

  it("ranks every band exactly once, with no gaps", () => {
    expect([...Object.values(BAND_RANK)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("covers every band in BANDS", () => {
    expect(Object.keys(BAND_RANK).sort()).toEqual([...BANDS].sort());
  });
});

describe("compareBands", () => {
  it("returns zero for the same band", () => {
    expect(compareBands("B", "B")).toBe(0);
  });

  it("returns a negative number when the first band is lower", () => {
    expect(compareBands("A", "C")).toBeLessThan(0);
  });

  it("returns a positive number when the first band is higher", () => {
    expect(compareBands("C", "A")).toBeGreaterThan(0);
  });
});

describe("isBand", () => {
  it("accepts every published band", () => {
    expect(BANDS.every(isBand)).toBe(true);
  });

  it("rejects a string that is not a band", () => {
    expect(isBand("D")).toBe(false);
  });

  it("rejects a non-string", () => {
    expect(isBand(3)).toBe(false);
  });
});
