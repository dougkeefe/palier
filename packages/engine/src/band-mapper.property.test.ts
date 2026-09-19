import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { bandRank, bandsFor } from "@palier/domain";

import { mapRawScore } from "./band-mapper.js";
import { pscSle } from "./__tests__/read-profile.js";

/**
 * implementation-plan.md 6.2, tier 2, verbatim:
 *
 *   "Band mapping is total and monotonic. Every raw score from 0 to the maximum
 *    maps to exactly one band, no gaps, no overlaps, and a higher score never
 *    yields a lower band. Run against every variant of every exam profile,
 *    which is what catches a typo in a cut score the day someone edits the
 *    profile JSON."
 *
 * The suite iterates `profile.variants` rather than naming the four. That is
 * the whole point: a fifth variant added without a cut table is covered the
 * moment it appears, with nobody remembering to add a case.
 */
const profile = pscSle();
const variants = Object.entries(profile.variants);

describe.each(variants)("band mapping over %s", (_name, variant) => {
  /**
   * Totality is asserted exhaustively, not sampled. The largest variant scores
   * 55 items, so this is 56 calls — cheaper than generating cases and strictly
   * stronger, since it leaves no score untested. Resist "simplifying" it into a
   * property; the property would be weaker.
   */
  it("maps every raw score from 0 to the maximum to exactly one band", () => {
    const scores = Array.from({ length: variant.scored + 1 }, (_, raw) => raw);

    const mapped = scores.map((raw) => {
      const outcome = mapRawScore(variant, raw);
      const matching = bandsFor(variant).filter((band) => {
        const range = variant.cuts[band];
        return range !== undefined && raw >= range[0] && raw <= range[1];
      });
      return { raw, band: outcome.band, matchingBands: matching.length };
    });

    expect(mapped.filter((m) => m.matchingBands !== 1)).toEqual([]);
  });

  it("covers the whole range with no gap, so no score is unmapped", () => {
    const unmapped = Array.from({ length: variant.scored + 1 }, (_, raw) => raw).filter(
      (raw) => {
        try {
          mapRawScore(variant, raw);
          return false;
        } catch {
          return true;
        }
      },
    );

    expect(unmapped).toEqual([]);
  });

  it("never yields a lower band for a higher score", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: variant.scored }),
        fc.integer({ min: 0, max: variant.scored }),
        (a, b) => {
          const [lower, higher] = a <= b ? [a, b] : [b, a];

          expect(mapRawScore(variant, higher).rank).toBeGreaterThanOrEqual(
            mapRawScore(variant, lower).rank,
          );
        },
      ),
    );
  });

  it("ranks its bands by BAND_RANK, not alphabetically", () => {
    const ranks = bandsFor(variant).map(bandRank);
    const ascending = [...ranks].sort((x, y) => x - y);

    expect(ranks).toEqual(ascending);
  });

  it("rejects a raw score above the scored count rather than clamping it", () => {
    expect(() => mapRawScore(variant, variant.scored + 1)).toThrow(RangeError);
  });

  it("rejects a negative raw score", () => {
    expect(() => mapRawScore(variant, -1)).toThrow(RangeError);
  });

  it("rejects a non-integer raw score, since a mark is not fractional", () => {
    expect(() => mapRawScore(variant, 1.5)).toThrow(RangeError);
  });

  it("reports no next band at the top, and one everywhere below it", () => {
    const top = mapRawScore(variant, variant.scored);
    const bottom = mapRawScore(variant, 0);

    expect({ topNext: top.next, bottomHasNext: bottom.next !== null }).toEqual({
      topNext: null,
      bottomHasNext: true,
    });
  });
});
