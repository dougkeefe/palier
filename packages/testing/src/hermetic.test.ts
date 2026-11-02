import { describe, expect, it } from "vitest";

import { HERMETIC_ENV_FLAG, HERMETIC_SETTINGS_GLOBAL, hermeticSettingsSeed, isHermetic } from "./hermetic.js";

describe("isHermetic", () => {
  it("is true when the flag is exactly 1", () => {
    expect(isHermetic({ [HERMETIC_ENV_FLAG]: "1" })).toBe(true);
  });

  it("is false when the flag is absent", () => {
    expect(isHermetic({})).toBe(false);
  });

  it("is false for any other value, so a stray 'false' does not enable it", () => {
    expect(isHermetic({ [HERMETIC_ENV_FLAG]: "false" })).toBe(false);
  });
});

describe("hermeticSettingsSeed (D270)", () => {
  it("gives the settings a spec set on the page, as key and value", () => {
    const profile = { dailyGoalMinutes: 20 };
    expect(hermeticSettingsSeed({ [HERMETIC_SETTINGS_GLOBAL]: { studyProfile: profile } })).toEqual([["studyProfile", profile]]);
  });

  it("gives none when the page has no seed, so a hermetic page starts empty", () => {
    expect(hermeticSettingsSeed({})).toEqual([]);
  });

  it("gives none for a seed that is not an object of settings", () => {
    expect(hermeticSettingsSeed({ [HERMETIC_SETTINGS_GLOBAL]: "studyProfile" })).toEqual([]);
    expect(hermeticSettingsSeed({ [HERMETIC_SETTINGS_GLOBAL]: null })).toEqual([]);
    expect(hermeticSettingsSeed({ [HERMETIC_SETTINGS_GLOBAL]: [["studyProfile", {}]] })).toEqual([]);
  });
});
