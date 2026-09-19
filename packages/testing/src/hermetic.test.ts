import { describe, expect, it } from "vitest";

import { HERMETIC_ENV_FLAG, isHermetic } from "./hermetic.js";

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
