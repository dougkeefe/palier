import { describe, expect, it } from "vitest";

import { seededRandom } from "./seeded-random.js";

describe("seededRandom", () => {
  it("returns a value in [0, 1)", () => {
    const random = seededRandom(1);
    const values = Array.from({ length: 1000 }, () => random.next());

    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it("returns a different sequence for a different seed", () => {
    const a = Array.from({ length: 10 }, seededRandom(1).next);
    const b = Array.from({ length: 10 }, seededRandom(2).next);

    expect(a).not.toEqual(b);
  });

  it("treats a negative seed as its unsigned 32-bit equivalent", () => {
    expect(seededRandom(-1).next()).toBe(seededRandom(0xffffffff).next());
  });
});
