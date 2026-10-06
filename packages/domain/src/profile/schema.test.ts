import { describe, expect, it } from "vitest";

import { parseExamProfile } from "./parse.js";
import { readProfile } from "../__tests__/read-profile.js";

/**
 * Every refinement in the profile schema, one test per rejection reason
 * (implementation-plan.md 6.2, tier 1). These are the checks that make the
 * profile testable rather than decorative: each one is a way a cut-score edit
 * could go wrong on a Tuesday evening.
 */
type Profile = Record<string, unknown>;

const withProfile = (mutate: (p: Profile) => void): Profile => {
  const p = readProfile() as Profile;
  mutate(p);
  return p;
};

const variantsOf = (p: Profile): Record<string, Record<string, unknown>> =>
  p["variants"] as Record<string, Record<string, unknown>>;

const errorsFrom = (p: unknown): string => {
  const result = parseExamProfile(p);
  return result.ok ? "" : result.errors.join(" | ");
};

describe("cut table partitioning", () => {
  it("rejects a gap between two bands", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["reading-supervised"]!["cuts"] = {
        X: [0, 17],
        A: [18, 27],
        B: [28, 36],
        C: [38, 44],
        E: [45, 50],
      };
    });
    expect(errorsFrom(broken)).toMatch(/Raw scores 37 to 37 are covered by no band/);
  });

  it("rejects an overlap between two bands", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["reading-supervised"]!["cuts"] = {
        X: [0, 17],
        A: [18, 28],
        B: [28, 37],
        C: [38, 44],
        E: [45, 50],
      };
    });
    expect(errorsFrom(broken)).toMatch(/Bands A and B overlap/);
  });

  it("rejects a table that does not start at zero", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["writing-unsupervised"]!["cuts"] = {
        A: [11, 16],
        B: [17, 23],
        C: [24, 30],
      };
    });
    expect(errorsFrom(broken)).toMatch(/raw scores 0 to 10 map to no band at all/i);
  });

  it("rejects a table that does not reach the scored count", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["reading-unsupervised"]!["cuts"] = {
        X: [0, 8],
        A: [9, 13],
        B: [14, 18],
        C: [19, 24],
      };
    });
    expect(errorsFrom(broken)).toMatch(/tops out at 24 but this variant has 25/);
  });

  it("rejects an empty cut table", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["reading-supervised"]!["cuts"] = {};
    });
    expect(errorsFrom(broken)).toMatch(/no cut table cannot be scored/);
  });

  it("rejects a range whose min exceeds its max", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["reading-supervised"]!["cuts"] = {
        X: [17, 0],
        A: [18, 27],
        B: [28, 37],
        C: [38, 44],
        E: [45, 50],
      };
    });
    expect(errorsFrom(broken)).toMatch(/runs from min to max/);
  });

  it("rejects a band a variant uses but the profile does not declare", () => {
    const broken = withProfile((p) => {
      p["bands"] = ["X", "A", "B", "C"];
    });
    expect(errorsFrom(broken)).toMatch(/uses band E, which this profile does not declare/);
  });
});

describe("variant arithmetic", () => {
  it("rejects scoring more items than are administered", () => {
    const broken = withProfile((p) => {
      variantsOf(p)["reading-supervised"]!["items"] = 40;
    });
    expect(errorsFrom(broken)).toMatch(/cannot score more items \(50\) than it administers \(40\)/);
  });

  it("rejects a profile with no variants", () => {
    const broken = withProfile((p) => {
      p["variants"] = {};
    });
    expect(errorsFrom(broken)).toMatch(/no variants cannot score a mock exam/);
  });
});

describe("band ordering", () => {
  it("rejects bands listed out of rank order, which invites an alphabetical sort", () => {
    const broken = withProfile((p) => {
      p["bands"] = ["A", "B", "C", "E", "X"];
    });
    expect(errorsFrom(broken)).toMatch(/must be listed lowest to highest/);
  });
});

describe("Leitner intervals", () => {
  it("rejects anything other than four intervals", () => {
    const broken = withProfile((p) => {
      p["leitnerIntervalDays"] = [1, 3, 7];
    });
    expect(errorsFrom(broken)).toMatch(/Expected exactly four intervals/);
  });

  it("rejects intervals that do not increase", () => {
    const broken = withProfile((p) => {
      p["leitnerIntervalDays"] = [1, 3, 3, 21];
    });
    expect(errorsFrom(broken)).toMatch(/must increase/);
  });

  it("rejects a zero or negative interval", () => {
    const broken = withProfile((p) => {
      p["leitnerIntervalDays"] = [0, 3, 7, 21];
    });
    expect(errorsFrom(broken)).not.toBe("");
  });
});

describe("taxonomies", () => {
  it("rejects a sub-skill the code has no union member for", () => {
    const broken = withProfile((p) => {
      const subSkills = p["subSkills"] as Record<string, string[]>;
      subSkills["reading"] = [...subSkills["reading"]!, "vibes"];
    });
    expect(errorsFrom(broken)).not.toBe("");
  });

  it("rejects a real sub-skill filed under the wrong skill", () => {
    // Valid everywhere, wrong here. The enum cannot catch this one, and it
    // would quietly make every writing item untaggable against it.
    const broken = withProfile((p) => {
      const subSkills = p["subSkills"] as Record<string, string[]>;
      subSkills["writing"] = [...subSkills["writing"]!, "main-idea"];
    });
    expect(errorsFrom(broken)).toMatch(/"main-idea" is not a writing sub-skill/);
  });

  it("rejects a duplicated sub-skill", () => {
    const broken = withProfile((p) => {
      const subSkills = p["subSkills"] as Record<string, string[]>;
      subSkills["reading"] = [...subSkills["reading"]!, "main-idea"];
    });
    expect(errorsFrom(broken)).toMatch(/names a sub-skill twice/);
  });

  it("rejects a duplicated topic", () => {
    const broken = withProfile((p) => {
      p["topics"] = [...(p["topics"] as string[]), "human-resources"];
    });
    expect(errorsFrom(broken)).toMatch(/names a topic twice/);
  });

  it("rejects a topic list that disagrees with the code", () => {
    const broken = withProfile((p) => {
      p["topics"] = (p["topics"] as string[]).slice(0, 11);
    });
    expect(errorsFrom(broken)).toMatch(/declares 11 topics but the code knows 12/);
  });
});

describe("the oral format", () => {
  it("rejects a raw-score cut table for oral, which the PSC does not publish", () => {
    const broken = withProfile((p) => {
      (p["oral"] as Record<string, unknown>)["cuts"] = { A: [0, 10] };
    });
    expect(errorsFrom(broken)).not.toBe("");
  });

  it("rejects a missing level descriptor", () => {
    const broken = withProfile((p) => {
      const oral = p["oral"] as Record<string, unknown>;
      const d = { ...(oral["descriptors"] as Record<string, unknown>) };
      delete d["C"];
      oral["descriptors"] = d;
    });
    expect(errorsFrom(broken)).not.toBe("");
  });

  it("rejects a descriptor missing a locale [R8]", () => {
    const broken = withProfile((p) => {
      const oral = p["oral"] as Record<string, unknown>;
      const d = oral["descriptors"] as Record<string, unknown>;
      d["C"] = { en: "English only." };
    });
    expect(errorsFrom(broken)).not.toBe("");
  });
});

describe("item statistics rules", () => {
  const withRules = (rules: Record<string, unknown>): Profile =>
    withProfile((p) => {
      p["itemStatistics"] = { ...(p["itemStatistics"] as Record<string, unknown>), ...rules };
    });

  it("rejects a proportion floor at or above the ceiling, or every item retires", () => {
    expect(errorsFrom(withRules({ pCorrectMin: 0.95 }))).toMatch(
      /pCorrectMin \(0.95\) must be below pCorrectMax \(0.95\)/,
    );
  });

  it("rejects a proportion outside 0 to 1", () => {
    expect(errorsFrom(withRules({ pCorrectMax: 1.2 }))).not.toBe("");
  });

  it("rejects a point-biserial floor outside -1 to 1", () => {
    expect(errorsFrom(withRules({ pointBiserialMin: -1.5 }))).not.toBe("");
  });

  it("rejects a minimum response count that is not a positive whole number", () => {
    expect(errorsFrom(withRules({ minResponsesDifficulty: 0 }))).not.toBe("");
    expect(errorsFrom(withRules({ minResponsesDiscrimination: 99.5 }))).not.toBe("");
  });

  it("rejects trusting a point-biserial on fewer responses than a proportion", () => {
    expect(
      errorsFrom(withRules({ minResponsesDifficulty: 100, minResponsesDiscrimination: 30 })),
    ).toMatch(/point-biserial needs more responses than a proportion correct/);
  });

  it("rejects an unknown rule, since the block is strict", () => {
    expect(errorsFrom(withRules({ reportsToRetire: 3 }))).not.toBe("");
  });

  it("rejects a profile with no rules at all", () => {
    const broken = withProfile((p) => {
      delete p["itemStatistics"];
    });
    expect(errorsFrom(broken)).not.toBe("");
  });
});

describe("diagnostic rules", () => {
  const withRules = (rules: Record<string, unknown>): Profile =>
    withProfile((p) => {
      p["diagnostic"] = { ...(p["diagnostic"] as Record<string, unknown>), ...rules };
    });

  it("rejects a band quota that does not add up to the run's size", () => {
    expect(errorsFrom(withRules({ bandQuota: { B: 15, C: 14 } }))).toMatch(
      /band quota draws 29 items but a diagnostic is 30/,
    );
  });

  it("rejects a quota at a band no item is tagged with", () => {
    expect(errorsFrom(withRules({ bandQuota: { B: 15, E: 15 } }))).not.toBe("");
  });

  it("rejects a secure accuracy or a starting share outside 0 to 1", () => {
    expect(errorsFrom(withRules({ secureAccuracy: 1.5 }))).not.toBe("");
    expect(errorsFrom(withRules({ startShare: -0.1 }))).not.toBe("");
  });

  it("rejects a run size or a retake interval that is not a positive whole number", () => {
    expect(errorsFrom(withRules({ size: 0, bandQuota: {} }))).not.toBe("");
    expect(errorsFrom(withRules({ retakeDays: 27.5 }))).not.toBe("");
  });

  it("rejects an unknown rule, since the block is strict", () => {
    expect(errorsFrom(withRules({ adaptive: true }))).not.toBe("");
  });

  it("rejects a profile with no diagnostic rules at all", () => {
    const broken = withProfile((p) => {
      delete p["diagnostic"];
    });
    expect(errorsFrom(broken)).not.toBe("");
  });
});

describe("misfiled sub-skill messages", () => {
  it("reads naturally when several are misfiled", () => {
    const broken = withProfile((p) => {
      const subSkills = p["subSkills"] as Record<string, string[]>;
      subSkills["writing"] = [...subSkills["writing"]!, "main-idea", "inference"];
    });
    expect(errorsFrom(broken)).toMatch(
      /"main-idea", "inference" are not writing sub-skills/,
    );
  });
});
