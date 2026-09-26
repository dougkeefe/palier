import { describe, expect, it } from "vitest";

import { evidenceLine, promptShown, stepAfter } from "./telemetry";

describe("promptShown", () => {
  it("asks a device that has not been asked", () => {
    expect(promptShown("unasked")).toBe(true);
  });

  it("never asks again once answered, either way", () => {
    expect(promptShown("on")).toBe(false);
    expect(promptShown("off")).toBe(false);
  });
});

describe("stepAfter", () => {
  it("thanks a yes and confirms a no", () => {
    expect(stepAfter("on")).toBe("shared");
    expect(stepAfter("off")).toBe("declined");
  });
});

describe("evidenceLine", () => {
  it("says nothing when no item is behind the trend", () => {
    expect(evidenceLine({ items: 0, trusted: 0 }, 30)).toBeNull();
  });

  it("gives the count behind the trend, how many are trusted, today none, and what trusted means", () => {
    expect(evidenceLine({ items: 42, trusted: 0 }, 30)).toEqual({ items: 42, trusted: 0, minimum: 30 });
    expect(evidenceLine({ items: 42, trusted: 5 }, 30)).toEqual({ items: 42, trusted: 5, minimum: 30 });
  });
});
