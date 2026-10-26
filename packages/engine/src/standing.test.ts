import { BANDS, TARGET_BANDS, bandRank, type Band, type TargetBand } from "@palier/domain";
import { describe, expect, it } from "vitest";

import { declaredStart, skillStanding } from "./standing.js";

const standing = (current: Band | null, target: TargetBand, exemptBand: Band = "E") =>
  skillStanding({ current, target, exemptBand });

describe("skillStanding", () => {
  it("is unknown when nothing is declared, whatever the target", () => {
    for (const target of TARGET_BANDS) expect(standing(null, target)).toBe("unknown");
  });

  it("is exempt when the declared band is the profile's exempt band, whatever the target", () => {
    for (const target of TARGET_BANDS) expect(standing("E", target)).toBe("exempt");
  });

  it("reads the exempt band from its argument, never a literal", () => {
    expect(standing("C", "B", "C")).toBe("exempt");
    expect(standing("E", "C", "C")).toBe("held");
  });

  it("is held at the target and above it, below the exempt band", () => {
    expect(standing("C", "C")).toBe("held");
    expect(standing("C", "B")).toBe("held");
    expect(standing("B", "B")).toBe("held");
    expect(standing("A", "A")).toBe("held");
  });

  it("is working below the target", () => {
    expect(standing("B", "C")).toBe("working");
    expect(standing("A", "B")).toBe("working");
    expect(standing("X", "A")).toBe("working");
  });

  it("agrees with band rank at every pair, so E never sorts below X", () => {
    for (const current of BANDS) {
      for (const target of TARGET_BANDS) {
        const expected =
          current === "E" ? "exempt" : bandRank(current) >= bandRank(target) ? "held" : "working";
        expect(standing(current, target)).toBe(expected);
      }
    }
  });
});

describe("declaredStart", () => {
  it("places nothing without a declaration", () => {
    expect(declaredStart(null, "C")).toBeNull();
  });

  it("places nothing at or above the target", () => {
    expect(declaredStart("C", "C")).toBeNull();
    expect(declaredStart("E", "B")).toBeNull();
  });

  it("starts at the declared band below the target", () => {
    expect(declaredStart("B", "C")).toBe("B");
    expect(declaredStart("A", "C")).toBe("A");
    expect(declaredStart("A", "B")).toBe("A");
  });

  it("starts X at A, the lowest band an item carries", () => {
    expect(declaredStart("X", "C")).toBe("A");
  });

  it("places nothing when the raised start is the target itself", () => {
    expect(declaredStart("X", "A")).toBeNull();
  });
});
