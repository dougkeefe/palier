import { describe, expect, it } from "vitest";

import { TARGET_CHOICES, resultChoices, resultValue, stairMessage } from "./levels";

describe("the level pickers' choices (D259)", () => {
  it("offers B or C as a target, as onboarding always has", () => {
    expect(TARGET_CHOICES).toEqual(["B", "C"]);
  });

  it("offers not yet, then every band the profile names, lowest first", () => {
    expect(resultChoices(["X", "A", "B", "C", "E"])).toEqual([null, "X", "A", "B", "C", "E"]);
  });

  it("gives not yet a value a radio can carry", () => {
    expect(resultValue(null)).toBe("none");
    expect(resultValue("C")).toBe("C");
  });

  it("says the target alone with nothing declared, the result held otherwise, and the exemption at it", () => {
    expect(stairMessage(null, "E")).toBe("stairNone");
    expect(stairMessage("B", "E")).toBe("stairHeld");
    expect(stairMessage("E", "E")).toBe("stairExempt");
  });
});
