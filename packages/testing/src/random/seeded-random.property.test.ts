import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { seededRandom } from "./seeded-random.js";

/**
 * The first property test in the repository. It asserts a real section 6.4
 * deliverable — "seeded Random and FakeClock everywhere" is worthless if the
 * seeding does not actually determine the sequence — rather than proving the
 * harness against nothing.
 */
describe("seededRandom, as a property", () => {
  it("emits the same sequence for the same seed, whatever the seed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
        const a = seededRandom(seed);
        const b = seededRandom(seed);

        const first = Array.from({ length: 100 }, () => a.next());
        const second = Array.from({ length: 100 }, () => b.next());

        expect(first).toEqual(second);
      }),
    );
  });

  it("never leaves [0, 1), whatever the seed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (seed) => {
        const value = seededRandom(seed).next();

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }),
    );
  });
});
