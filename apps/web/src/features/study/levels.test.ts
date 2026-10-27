import { describe, expect, it } from "vitest";

import { TARGET_CHOICES, stairMessage } from "./levels";

describe("the level pickers' choices (D259)", () => {
  it("offers B or C as a target, as onboarding always has", () => {
    expect(TARGET_CHOICES).toEqual(["B", "C"]);
  });

  it("says the target alone with nothing declared, the result held otherwise, and the exemption at it", () => {
    expect(stairMessage(null, "E")).toBe("stairNone");
    expect(stairMessage("B", "E")).toBe("stairHeld");
    expect(stairMessage("E", "E")).toBe("stairExempt");
  });
});
