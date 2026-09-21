import { describe, expect, it } from "vitest";

import type { IdGenerator } from "@palier/app";

/**
 * The shared contract every `IdGenerator` must satisfy, exported as a function so
 * the Web Crypto adapter and the deterministic counter are held to the same bar
 * (implementation-plan.md §6.2 tier 3, ADR 10). The invariants are exactly what
 * the rest of the system relies on: ids are unique, they are valid 26-character
 * Crockford base32 ULIDs, and a burst of them is **strictly increasing** as
 * strings, so they sort by creation order (`AttemptStore` returns in insertion
 * order; `calculateTrend` sorts attempts by id/timestamp).
 */

/** Crockford base32: the ULID alphabet, minus I, L, O and U. */
const ULID = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

export const idGeneratorContract = (name: string, make: () => IdGenerator): void => {
  describe(`IdGenerator contract: ${name}`, () => {
    it("mints 26-character Crockford base32 ULIDs", () => {
      const gen = make();
      expect(gen.ulid()).toMatch(ULID);
    });

    it("mints unique ids across a burst", () => {
      const gen = make();
      const ids = Array.from({ length: 1000 }, () => gen.ulid());
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("mints strictly increasing ids across a burst, so they sort by creation order", () => {
      const gen = make();
      const ids = Array.from({ length: 1000 }, () => gen.ulid());
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
      // Strictly, not merely non-decreasing: no two ids are equal.
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
};
