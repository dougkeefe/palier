import { describe, expect, it } from "vitest";

import { buildWith } from "./builders.js";

describe("buildWith", () => {
  it("returns the defaults when given no overrides", () => {
    expect(buildWith({ band: "B", skill: "reading" })()).toEqual({
      band: "B",
      skill: "reading",
    });
  });

  it("applies overrides over the defaults", () => {
    expect(buildWith({ band: "B", skill: "reading" })({ band: "C" })).toEqual({
      band: "C",
      skill: "reading",
    });
  });

  it("does not let one built object mutate the next", () => {
    const anThing = buildWith({ band: "B" });
    const first = anThing();
    first.band = "C";

    expect(anThing().band).toBe("B");
  });
});
